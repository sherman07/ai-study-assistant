

def validate_signup_payload(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, str]]:
    first_name = clean_signup_text(payload.get("firstName") or payload.get("first_name"))
    last_name = clean_signup_text(payload.get("lastName") or payload.get("last_name"))
    role = clean_signup_text(payload.get("role") or "student", 40).lower()
    email = normalize_auth_email(payload.get("email"))
    password = str(payload.get("password") or "")
    confirm_password = str(payload.get("confirmPassword") or payload.get("confirm_password") or "")
    terms_accepted = payload.get("termsAccepted")
    if terms_accepted is None:
        terms_accepted = payload.get("terms_accepted")

    errors: Dict[str, str] = {}
    if not first_name:
        errors["firstName"] = "First name is required."
    if not last_name:
        errors["lastName"] = "Last name is required."
    if role not in AUTH_SIGNUP_ROLES:
        errors["role"] = "Choose a valid account type."
    if not email:
        errors["email"] = "Email is required."
    elif not AUTH_EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    if not password:
        errors["password"] = "Password is required."
    elif len(password) < 8:
        errors["password"] = "Password must be at least 8 characters."
    elif not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        errors["password"] = "Password must include at least one letter and one number."
    elif password.lower() in AUTH_COMMON_WEAK_PASSWORDS:
        errors["password"] = "Choose a stronger password."
    else:
        email_name = email.split("@", 1)[0].lower() if email else ""
        if len(email_name) >= 4 and email_name in password.lower():
            errors["password"] = "Password cannot contain your email name."
    if not confirm_password:
        errors["confirmPassword"] = "Please confirm your password."
    elif password and password != confirm_password:
        errors["confirmPassword"] = "Passwords do not match."
    if terms_accepted is not True:
        errors["terms"] = "You must agree to the Terms of Service and Privacy Policy."

    clean_payload = {
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "email": email,
        "password": password,
    }
    return clean_payload, errors


def validate_resend_payload(payload: Dict[str, Any]) -> Tuple[str, Dict[str, str]]:
    email = normalize_auth_email(payload.get("email"))
    errors: Dict[str, str] = {}
    if not email:
        errors["email"] = "Email is required."
    elif not AUTH_EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address."
    return email, errors


def supabase_admin_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


def supabase_public_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }


def supabase_auth_config_error(require_service_role: bool = False) -> Optional[str]:
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_ANON_KEY:
        missing.append("SUPABASE_ANON_KEY")
    if require_service_role and not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        return f"Supabase Auth is not configured on the backend. Missing: {', '.join(missing)}."
    return None


def synapse_email_config_error() -> Optional[str]:
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not SYNAPSE_SMTP_HOST:
        missing.append("SYNAPSE_SMTP_HOST")
    if not SYNAPSE_SMTP_FROM_EMAIL:
        missing.append("SYNAPSE_SMTP_FROM_EMAIL")
    if SYNAPSE_SMTP_SECURITY not in {"starttls", "ssl", "none"}:
        missing.append("SYNAPSE_SMTP_SECURITY (starttls, ssl, or none)")
    if missing:
        return f"Synapse email delivery is not configured. Missing: {', '.join(missing)}."
    return None


def supabase_user_confirmed(user: Dict[str, Any]) -> bool:
    return bool(
        user.get("email_confirmed_at")
        or user.get("confirmed_at")
        or (user.get("confirmation_sent_at") and user.get("last_sign_in_at"))
    )


def supabase_auth_error_message(error_text: str) -> str:
    lowered = error_text.lower()
    if "rate" in lowered or "too many" in lowered:
        return "Supabase is rate-limiting confirmation emails. Please wait a moment and try again."
    if "smtp" in lowered or "email" in lowered or "mail" in lowered:
        return "Supabase could not send the confirmation email. Check Auth email/SMTP settings."
    if "redirect" in lowered:
        return "Supabase rejected the confirmation redirect URL. Check the Site URL and redirect allow list."
    return "Supabase could not complete the auth request. Please try again."


def find_supabase_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    target = normalize_auth_email(email)

    def match_users(users: Any) -> Optional[Dict[str, Any]]:
        if not isinstance(users, list):
            return None
        for user in users:
            if normalize_auth_email(user.get("email")) == target:
                return user
        return None

    # Prefer a filtered lookup so signup does not wait on a full user scan.
    filtered = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=supabase_admin_headers(),
        params={"page": 1, "per_page": 200, "filter": target},
        timeout=8,
    )
    if filtered.status_code < 400:
        payload = filtered.json()
        users = payload.get("users") if isinstance(payload, dict) else payload
        matched = match_users(users)
        if matched:
            return matched
        # Some GoTrue builds honor filter as an exact/prefix search. If the page
        # is empty, the email is not present and we can skip the full scan.
        if isinstance(users, list) and not users:
            return None

    per_page = 200
    max_pages = 5
    for page in range(1, max_pages + 1):
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=supabase_admin_headers(),
            params={"page": page, "per_page": per_page},
            timeout=8,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"admin list users failed: {response.status_code} {response.text[:240]}")
        payload = response.json()
        users = payload.get("users") if isinstance(payload, dict) else payload
        matched = match_users(users)
        if matched:
            return matched
        if not isinstance(users, list) or len(users) < per_page:
            return None
    return None


def synapse_link_from_generate_payload(payload: Dict[str, Any], redirect_to: str, fallback_type: str) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    token_hash = payload.get("hashed_token")
    verification_type = str(payload.get("verification_type") or fallback_type or "").strip() or fallback_type
    if token_hash:
        return build_synapse_auth_link(redirect_to, str(token_hash), verification_type)
    action_link = payload.get("action_link")
    return str(action_link) if action_link else None


def call_supabase_generate_signup_link(
    clean_payload: Dict[str, Any],
    redirect_to: str,
) -> Tuple[Optional[str], Optional[Dict[str, Any]], Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=supabase_admin_headers(),
        json={
            "type": "signup",
            "email": clean_payload["email"],
            "password": clean_payload["password"],
            "data": {
                "first_name": clean_payload["first_name"],
                "last_name": clean_payload["last_name"],
                "role": clean_payload["role"],
                "plan": "free",
                "credits": 500,
            },
            "redirect_to": redirect_to,
        },
        timeout=12,
    )
    if response.status_code >= 400:
        return None, None, response.text[:500], response.status_code
    payload = response.json()
    action_link = synapse_link_from_generate_payload(payload if isinstance(payload, dict) else {}, redirect_to, "signup")
    if not action_link:
        return None, None, "Supabase did not return a signup action link.", 502
    user = payload.get("user") if isinstance(payload, dict) else None
    return str(action_link), user if isinstance(user, dict) else None, None, response.status_code


def call_supabase_resend(email: str, redirect_to: str) -> Tuple[bool, Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/resend",
        headers=supabase_public_headers(),
        params={"redirect_to": redirect_to},
        json={"type": "signup", "email": email},
        timeout=18,
    )
    if response.status_code >= 400:
        return False, response.text[:500], response.status_code
    return True, None, response.status_code


def password_reset_redirect_to(request: Request, payload: Dict[str, Any]) -> str:
    raw = str(payload.get("redirectTo") or payload.get("redirect_to") or "").strip()
    email_base = auth_email_frontend_base_url()
    if is_allowed_auth_redirect(raw, kind="reset"):
        raw_host = urlparse(raw).hostname or ""
        if auth_local_dev_host(raw_host) and auth_public_backend_is_production():
            return f"{email_base}/reset-password.html"
        return raw
    return f"{email_base}/reset-password.html"


def build_synapse_auth_link(redirect_to: str, token_hash: str, verification_type: str) -> str:
    parsed = urlparse(redirect_to)
    fragment = urlencode({"token_hash": token_hash, "type": verification_type})
    return urlunparse(parsed._replace(fragment=fragment))


def call_supabase_generate_recovery_link(email: str, redirect_to: str) -> Tuple[Optional[str], Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=supabase_admin_headers(),
        json={
            "type": "recovery",
            "email": email,
            "redirect_to": redirect_to,
        },
        timeout=18,
    )
    if response.status_code >= 400:
        return None, response.text[:500], response.status_code
    payload = response.json()
    token_hash = payload.get("hashed_token") if isinstance(payload, dict) else None
    verification_type = payload.get("verification_type") if isinstance(payload, dict) else None
    if not token_hash or verification_type != "recovery":
        return None, "Supabase did not return a valid recovery token.", 502
    return build_synapse_auth_link(redirect_to, str(token_hash), "recovery"), None, response.status_code


def call_supabase_generate_invite_link(email: str, redirect_to: str) -> Tuple[Optional[str], Optional[str], int]:
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/generate_link",
        headers=supabase_admin_headers(),
        json={
            "type": "invite",
            "email": email,
            "redirect_to": redirect_to,
        },
        timeout=12,
    )
    if response.status_code >= 400:
        return None, response.text[:500], response.status_code
    payload = response.json()
    action_link = synapse_link_from_generate_payload(payload if isinstance(payload, dict) else {}, redirect_to, "invite")
    if not action_link:
        return None, "Supabase did not return a confirmation action link.", 502
    return str(action_link), None, response.status_code


def queue_synapse_auth_email(background_tasks: Optional[BackgroundTasks], sender, *args) -> None:
    """Send auth mail immediately in-process, or queue it so the API can return fast."""
    if background_tasks is not None:
        background_tasks.add_task(sender, *args)
        return
    sender(*args)


def send_synapse_auth_email(
    email: str,
    *,
    subject: str,
    heading: str,
    intro: str,
    action_label: str,
    action_link: str,
    safety_note: str,
) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((SYNAPSE_SMTP_FROM_NAME, SYNAPSE_SMTP_FROM_EMAIL))
    message["To"] = email
    message.set_content(
        f"{intro}\n\n"
        f"{action_label}:\n{action_link}\n\n"
        f"{safety_note}\n\n"
        "Synapse\n"
    )
    escaped_link = html.escape(action_link, quote=True)
    message.add_alternative(
        "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#17233c;line-height:1.6\">"
        f"<h2>{html.escape(heading)}</h2>"
        f"<p>{html.escape(intro)}</p>"
        f"<p><a href=\"{escaped_link}\" style=\"display:inline-block;padding:12px 18px;background:#4a7cff;color:#fff;text-decoration:none;border-radius:8px\">{html.escape(action_label)}</a></p>"
        f"<p>{html.escape(safety_note)}</p>"
        "<p>Synapse</p></body></html>",
        subtype="html",
    )

    smtp_class = smtplib.SMTP_SSL if SYNAPSE_SMTP_SECURITY == "ssl" else smtplib.SMTP
    with smtp_class(SYNAPSE_SMTP_HOST, SYNAPSE_SMTP_PORT, timeout=20) as server:
        if SYNAPSE_SMTP_SECURITY == "starttls":
            server.starttls(context=ssl.create_default_context())
        if SYNAPSE_SMTP_USERNAME:
            server.login(SYNAPSE_SMTP_USERNAME, SYNAPSE_SMTP_PASSWORD)
        server.send_message(message)


def send_synapse_password_reset_email(email: str, action_link: str) -> None:
    send_synapse_auth_email(
        email,
        subject="Reset your Synapse password",
        heading="Reset your Synapse password",
        intro="We received a request to reset your Synapse password.",
        action_label="Choose a new password",
        action_link=action_link,
        safety_note="This link is single-use. If you did not request this, you can safely ignore this email.",
    )


def send_synapse_signup_confirmation_email(email: str, action_link: str) -> None:
    send_synapse_auth_email(
        email,
        subject="Confirm your Synapse account",
        heading="Confirm your Synapse account",
        intro="Your Synapse account is almost ready. Confirm your email address to start studying.",
        action_label="Confirm email address",
        action_link=action_link,
        safety_note="This link is single-use. If you did not create a Synapse account, you can safely ignore this email.",
    )


def existing_account_response(email: str, user: Dict[str, Any]) -> Response:
    account_ref = user.get("id") or masked_auth_email(email)
    if supabase_user_confirmed(user):
        logger.info("Duplicate confirmed Supabase account detected for %s", account_ref)
        return auth_api_response(
            False,
            "existing_confirmed",
            "An account already exists for this email. Please log in instead.",
            email=email,
            actions=["login", "forgot_password"],
        )
    logger.info("Unconfirmed Supabase account detected for %s", account_ref)
    return auth_api_response(
        False,
        "existing_unconfirmed",
        "This email already has a pending account. Please check your inbox or resend the confirmation email.",
        email=email,
        actions=["resend_confirmation", "change_email"],
    )


def persist_generated_analysis_result(
    request: Optional[Request],
    result: Dict[str, Any],
    client_fingerprint: str = "",
) -> Dict[str, Any]:
    if not isinstance(result, dict) or result.get("error"):
        return {}
    try:
        identity = database_identity_from_request(request, client_fingerprint)
        return synapse_database.upsert_generated_content(identity, result, client_fingerprint)
    except Exception as error:
        logger.warning("Generated content persistence skipped: %s", error)
        return {}


def price_id_for_plan(plan_id: str, explicit_price_id: str = "") -> str:
    clean_plan = re.sub(r"[^a-z0-9_-]", "", str(plan_id or "").lower())
    clean_explicit = str(explicit_price_id or "").strip()
    configured_values = {value for value in STRIPE_PRICE_IDS.values() if value}
    if clean_explicit and clean_explicit in configured_values:
        return clean_explicit
    return STRIPE_PRICE_IDS.get(clean_plan, "")


def require_stripe_ready() -> Optional[Response]:
    if not stripe or not STRIPE_SECRET_KEY:
        return json_error("Stripe billing is not configured. Set STRIPE_SECRET_KEY and Stripe price IDs.", 503)
    return None


def billing_store() -> Dict[str, Any]:
    store = read_runtime_json("billing_customers.json", {})
    return store if isinstance(store, dict) else {}


def save_billing_store(store: Dict[str, Any]) -> None:
    write_runtime_json("billing_customers.json", store)


def get_billing_profile(user: Dict[str, Any]) -> Dict[str, Any]:
    store = billing_store()
    profile = store.get(user["id"])
    if isinstance(profile, dict):
        return profile
    profile = {
        "user_id": user["id"],
        "email": user.get("email"),
        "stripe_customer_id": "",
        "created_at": utc_timestamp(),
        "updated_at": utc_timestamp(),
    }
    store[user["id"]] = profile
    save_billing_store(store)
    return profile


def save_billing_profile(user_id: str, profile: Dict[str, Any]) -> None:
    store = billing_store()
    profile["updated_at"] = utc_timestamp()
    store[user_id] = profile
    save_billing_store(store)
