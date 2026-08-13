

def get_or_create_stripe_customer(user: Dict[str, Any]) -> str:
    profile = get_billing_profile(user)
    if profile.get("stripe_customer_id"):
        return profile["stripe_customer_id"]
    customer = stripe.Customer.create(
        email=user.get("email"),
        metadata={
            "synapse_user_id": user["id"],
            "source": "synapse",
        },
    )
    profile["stripe_customer_id"] = customer.id
    save_billing_profile(user["id"], profile)
    return customer.id


def _clean_contact_text(value: Any, limit: int) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())[:limit]


def _valid_contact_email(value: str) -> bool:
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value or ""))


@app.post("/api/auth/signup")
async def signup_account(request: Request, background_tasks: BackgroundTasks) -> Response:
    logger.info("Signup attempt started")
    payload = await request_json_payload(request)
    clean_payload, errors = validate_signup_payload(payload)
    email = clean_payload["email"]
    email_ref = masked_auth_email(email)
    logger.info("Signup email normalized: %s", email_ref)
    if errors:
        return auth_api_response(
            False,
            "validation_error",
            "Please fix the highlighted fields.",
            422,
            errors=errors,
        )

    config_error = synapse_email_config_error()
    if config_error:
        logger.error("Signup blocked by auth email configuration: %s", config_error)
        return auth_api_response(False, "email_not_configured", config_error, 503)

    try:
        existing_user = await asyncio.to_thread(find_supabase_user_by_email, email)
    except Exception as error:
        logger.exception("Supabase admin account lookup failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "account_lookup_failed",
            "Could not verify this email with Supabase. Please try again.",
            502,
        )
    if existing_user:
        return existing_account_response(email, existing_user)

    redirect_to = signup_redirect_to(request, payload)
    try:
        action_link, user, signup_error, signup_status = await asyncio.to_thread(
            call_supabase_generate_signup_link,
            clean_payload,
            redirect_to,
        )
    except Exception as error:
        logger.exception("Supabase signup request failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "signup_request_failed",
            "Could not reach Supabase Auth. Please try again.",
            502,
        )

    if signup_error:
        logger.error("Supabase signup error for %s: %s", email_ref, signup_error)
        try:
            existing_user = await asyncio.to_thread(find_supabase_user_by_email, email)
        except Exception:
            existing_user = None
        if existing_user:
            return existing_account_response(email, existing_user)
        return auth_api_response(
            False,
            "signup_failed",
            supabase_auth_error_message(signup_error),
            502 if signup_status >= 500 else 400,
        )

    if not action_link:
        logger.error("Supabase signup for %s did not return a confirmation link", email_ref)
        return auth_api_response(
            False,
            "signup_failed",
            "Synapse could not prepare the confirmation email. Please try again.",
            502,
        )

    # Queue SMTP delivery so the signup API returns immediately instead of
    # blocking on provider latency (often the multi-minute wait users feel).
    queue_synapse_auth_email(background_tasks, send_synapse_signup_confirmation_email, email, action_link)
    logger.info(
        "Supabase signup accepted for %s; confirmation email queued to %s",
        email_ref,
        urlparse(redirect_to).netloc or redirect_to,
    )
    return auth_api_response(
        True,
        "created_confirmation_sent",
        "Account created. Check your email to confirm your Synapse account, then log in.",
        email=email,
        actions=["login", "resend_confirmation"],
    )


@app.post("/api/auth/resend-confirmation")
async def resend_signup_confirmation(request: Request, background_tasks: BackgroundTasks) -> Response:
    payload = await request_json_payload(request)
    email, errors = validate_resend_payload(payload)
    email_ref = masked_auth_email(email)
    logger.info("Confirmation resend requested for %s", email_ref)
    if errors:
        return auth_api_response(
            False,
            "validation_error",
            "Please enter a valid email address.",
            422,
            errors=errors,
        )

    config_error = synapse_email_config_error()
    if config_error:
        logger.error("Confirmation resend blocked by auth email configuration: %s", config_error)
        return auth_api_response(False, "email_not_configured", config_error, 503)

    try:
        existing_user = await asyncio.to_thread(find_supabase_user_by_email, email)
    except Exception as error:
        logger.exception("Supabase admin account lookup failed before resend for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "account_lookup_failed",
            "Could not verify this email with Supabase. Please try again.",
            502,
        )
    if not existing_user:
        logger.info("Confirmation resend skipped; no Supabase account for %s", email_ref)
        return auth_api_response(
            False,
            "account_not_found",
            "No pending Synapse account was found for this email. Create a new account instead.",
            404,
            email=email,
        )
    if supabase_user_confirmed(existing_user):
        return existing_account_response(email, existing_user)

    redirect_to = signup_redirect_to(request, payload)
    try:
        action_link, resend_error, resend_status = await asyncio.to_thread(
            call_supabase_generate_invite_link,
            email,
            redirect_to,
        )
    except Exception as error:
        logger.exception("Supabase confirmation resend request failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "resend_request_failed",
            "Could not reach Supabase Auth. Please try again.",
            502,
        )
    if resend_error or not action_link:
        logger.error("Supabase confirmation resend error for %s: %s", email_ref, resend_error)
        return auth_api_response(
            False,
            "resend_failed",
            supabase_auth_error_message(resend_error or ""),
            502 if resend_status >= 500 else 400,
            email=email,
        )

    queue_synapse_auth_email(background_tasks, send_synapse_signup_confirmation_email, email, action_link)
    logger.info("Supabase confirmation resend accepted for %s", email_ref)
    return auth_api_response(
        True,
        "confirmation_resent",
        "Confirmation email sent. Please check your inbox and spam folder.",
        email=email,
        actions=["login"],
    )


@app.post("/api/auth/request-password-reset")
async def request_password_reset(request: Request) -> Response:
    payload = await request_json_payload(request)
    email, errors = validate_resend_payload(payload)
    email_ref = masked_auth_email(email)
    if errors:
        return auth_api_response(
            False,
            "validation_error",
            "Please enter a valid email address.",
            422,
            errors=errors,
        )

    config_error = synapse_email_config_error()
    if config_error:
        logger.error("Password reset email blocked by configuration: %s", config_error)
        return auth_api_response(False, "email_not_configured", config_error, 503)

    redirect_to = password_reset_redirect_to(request, payload)
    try:
        action_link, link_error, link_status = await asyncio.to_thread(
            call_supabase_generate_recovery_link,
            email,
            redirect_to,
        )
    except Exception as error:
        logger.exception("Password reset link generation failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "password_reset_failed",
            "Synapse could not prepare the password reset email. Please try again.",
            502,
        )

    if link_error or not action_link:
        # Keep unknown-account responses indistinguishable from accepted requests.
        if link_status in {400, 404}:
            logger.info("Password reset requested for an unavailable account: %s", email_ref)
            return auth_api_response(
                True,
                "password_reset_requested",
                "If this email belongs to a Synapse account, a reset link will arrive shortly.",
            )
        logger.error("Password reset link generation failed for %s: %s", email_ref, link_error or "missing link")
        return auth_api_response(
            False,
            "password_reset_failed",
            "Synapse could not prepare the password reset email. Please try again.",
            502,
        )

    try:
        await asyncio.to_thread(send_synapse_password_reset_email, email, action_link)
    except Exception as error:
        logger.exception("Password reset email delivery failed for %s: %s", email_ref, error)
        return auth_api_response(
            False,
            "password_reset_delivery_failed",
            "Synapse could not send the password reset email. Please try again later.",
            502,
        )

    logger.info("Password reset email sent for %s", email_ref)
    return auth_api_response(
        True,
        "password_reset_requested",
        "If this email belongs to a Synapse account, a reset link will arrive shortly.",
    )


@app.post("/contact")
async def submit_contact(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
    except Exception:
        payload = dict(await request.form())

    if _clean_contact_text(payload.get("company"), 160):
        return {"ok": True, "message": "Thanks, your enquiry has been received."}

    name = _clean_contact_text(payload.get("name"), 120)
    email = _clean_contact_text(payload.get("email"), 180).lower()
    interest = _clean_contact_text(payload.get("interest"), 80) or "general"
    message = _clean_contact_text(payload.get("message"), 4000)

    if not name:
        return Response(
            json.dumps({"error": "Name is required."}),
            status_code=422,
            media_type="application/json",
        )
    if not _valid_contact_email(email):
        return Response(
            json.dumps({"error": "A valid email address is required."}),
            status_code=422,
            media_type="application/json",
        )
    if len(message) < 12:
        return Response(
            json.dumps({"error": "Message must be at least 12 characters."}),
            status_code=422,
            media_type="application/json",
        )

    record = {
        "received_at": utc_timestamp(),
        "name": name,
        "email": email,
        "interest": interest,
        "message": message,
        "source": _clean_contact_text(payload.get("source"), 80) or "website",
        "user_agent": request.headers.get("user-agent", "")[:300],
    }
    contact_path = RUNTIME_ASSETS_DIR.parent / "contact_inquiries.jsonl"
    contact_path.parent.mkdir(parents=True, exist_ok=True)
    with contact_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    webhook_url = (os.getenv("SYNAPSE_CONTACT_WEBHOOK_URL") or "").strip()
    if webhook_url:
        try:
            requests.post(webhook_url, json=record, timeout=8)
        except Exception:
            return {
                "ok": True,
                "message": "Thanks, your enquiry has been saved. Email delivery is configured but the webhook did not respond.",
            }

    return {
        "ok": True,
        "message": "Thanks, your enquiry has been received.",
    }


@app.get("/db/status")
def database_status() -> Dict[str, Any]:
    try:
        status = synapse_database.status()
        return {
            "ok": True,
            "database": "supabase-data-api",
            "data_api_reachable": bool(status.get("ok")),
            "data_api_status": status.get("status", "unknown"),
        }
    except Exception as error:
        return {
            "ok": False,
            "database": "supabase-data-api",
            "error": "Data API status check failed.",
        }


@app.get("/content/history")
async def list_generated_content_history(request: Request, limit: int = 50) -> Any:
    try:
        identity = database_identity_from_request(request)
        return {
            "ok": True,
            "items": synapse_database.list_generated_content(identity, limit),
        }
    except Exception as error:
        logger.warning("Generated content history load failed: %s", error)
        return json_error("Could not load generated content history right now.", 500)


@app.get("/content/{content_id}")
async def get_generated_content_record(content_id: str, request: Request) -> Any:
    try:
        identity = database_identity_from_request(request)
        record = synapse_database.get_generated_content(identity, content_id)
        if not record:
            return json_error("Generated content was not found for this user.", 404)
        return {"ok": True, "content": record}
    except Exception as error:
        logger.warning("Generated content load failed: %s", error)
        return json_error("Could not load generated content right now.", 500)


@app.delete("/content/{content_id}")
async def delete_generated_content_record(content_id: str, request: Request) -> Any:
    try:
        identity = database_identity_from_request(request)
        deleted = synapse_database.delete_generated_content(identity, content_id)
        if not deleted:
            return json_error("Generated content was not found for this user.", 404)
        return {"ok": True, "deleted": True, "id": content_id}
    except Exception as error:
        logger.warning("Generated content deletion failed: %s", error)
        return json_error("Could not delete generated content right now.", 500)


@app.post("/billing/checkout")
async def create_billing_checkout(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    stripe_error = require_stripe_ready()
    if stripe_error:
        return stripe_error
    user = user_or_response
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    plan_id = _clean_contact_text(payload.get("plan_id"), 40) or "student"
    price_id = price_id_for_plan(plan_id, _clean_contact_text(payload.get("price_id"), 120))
    if not price_id:
        return json_error(f"No Stripe price is configured for the {plan_id} plan.", 422)

    success_url = _clean_contact_text(payload.get("success_url"), 500) or f"{SYNAPSE_FRONTEND_BASE_URL}/index.html?billing=success"
    cancel_url = _clean_contact_text(payload.get("cancel_url"), 500) or f"{SYNAPSE_FRONTEND_BASE_URL}/index.html?billing=cancelled"
    customer_id = get_or_create_stripe_customer(user)
    session = stripe.checkout.Session.create(
        customer=customer_id,
        client_reference_id=user["id"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "synapse_user_id": user["id"],
            "synapse_plan_id": plan_id,
            "synapse_price_id": price_id,
        },
        customer_update={"name": "auto"},
    )
    return {
        "ok": True,
        "id": session.id,
        "url": session.url,
        "customer_id": customer_id,
    }
