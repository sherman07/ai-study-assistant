

@app.post("/billing/portal")
async def create_billing_portal(request: Request) -> Any:
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
    profile = get_billing_profile(user)
    customer_id = profile.get("stripe_customer_id")
    if not customer_id:
        return json_error("No Stripe customer exists for this account yet. Buy a credit pack first.", 404)
    return_url = _clean_contact_text(payload.get("return_url"), 500) or f"{SYNAPSE_FRONTEND_BASE_URL}/index.html"
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return {
        "ok": True,
        "url": session.url,
        "customer_id": customer_id,
    }


@app.post("/billing/webhook")
async def stripe_billing_webhook(request: Request) -> Any:
    body = await request.body()
    try:
        if STRIPE_WEBHOOK_SECRET:
            if not stripe:
                return json_error("Stripe package is not installed.", 503)
            signature = request.headers.get("stripe-signature", "")
            event = stripe.Webhook.construct_event(body, signature, STRIPE_WEBHOOK_SECRET)
        elif not SYNAPSE_ALLOW_UNSIGNED_STRIPE_WEBHOOK:
            return json_error("Stripe webhook signing is not configured.", 503)
        else:
            event = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        return json_error("Invalid Stripe webhook payload.", 400)

    event_type = event.get("type", "")
    event_object = (event.get("data") or {}).get("object") or {}
    record = {
        "received_at": utc_timestamp(),
        "event_id": event.get("id"),
        "type": event_type,
        "object_id": event_object.get("id"),
        "customer_id": event_object.get("customer"),
        "synapse_user_id": (event_object.get("metadata") or {}).get("synapse_user_id")
            or event_object.get("client_reference_id"),
        "plan_id": (event_object.get("metadata") or {}).get("synapse_plan_id"),
        "price_id": (event_object.get("metadata") or {}).get("synapse_price_id"),
        "payment_status": event_object.get("payment_status"),
        "amount_total": event_object.get("amount_total"),
        "currency": event_object.get("currency"),
    }
    append_runtime_jsonl("billing_ledger.jsonl", record)
    return {"ok": True, "received": True}


@app.get("/account/export")
async def export_account_data(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    user = user_or_response
    email = (user.get("email") or "").lower()
    profile = get_billing_profile(user)
    ledger = [
        item for item in read_runtime_jsonl("billing_ledger.jsonl")
        if item.get("synapse_user_id") == user["id"] or item.get("customer_id") == profile.get("stripe_customer_id")
    ]
    contacts = [
        item for item in read_runtime_jsonl("contact_inquiries.jsonl")
        if (item.get("email") or "").lower() == email
    ]
    deletions = [
        item for item in read_runtime_jsonl("account_deletions.jsonl")
        if item.get("synapse_user_id") == user["id"]
    ]
    database_identity = database_identity_from_verified_user(user)
    generated_content = synapse_database.export_user_content(database_identity)
    return {
        "ok": True,
        "exported_at": utc_timestamp(),
        "user": public_user_payload(user),
        "billing_profile": profile,
        "billing_ledger": ledger,
        "contact_inquiries": contacts,
        "deletion_requests": deletions,
        "generated_content": generated_content,
        "note": "Browser-local-only history is exported by the frontend. Server-generated content saved after this database feature is included here.",
    }


@app.post("/account/delete")
async def delete_account(request: Request) -> Any:
    user_or_response = require_verified_user(request)
    if isinstance(user_or_response, Response):
        return user_or_response
    user = user_or_response
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    if payload.get("confirm") is not True:
        return json_error("Account deletion requires confirm=true.", 422)

    profile = get_billing_profile(user)
    deletion_record = {
        "deleted_at": utc_timestamp(),
        "synapse_user_id": user["id"],
        "email": user.get("email"),
        "stripe_customer_id": profile.get("stripe_customer_id"),
        "generated_content_deleted": 0,
        "supabase_deleted": False,
        "stripe_marked_deleted": False,
    }
    try:
        deletion_record["generated_content_deleted"] = synapse_database.delete_user_content(
            database_identity_from_verified_user(user)
        )
    except Exception:
        deletion_record["generated_content_deleted"] = 0

    if stripe and STRIPE_SECRET_KEY and profile.get("stripe_customer_id"):
        try:
            stripe.Customer.modify(
                profile["stripe_customer_id"],
                metadata={
                    "synapse_user_id": user["id"],
                    "synapse_deleted_at": deletion_record["deleted_at"],
                },
            )
            deletion_record["stripe_marked_deleted"] = True
        except Exception:
            deletion_record["stripe_marked_deleted"] = False

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            response = requests.delete(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user['id']}",
                headers={
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                },
                timeout=15,
            )
            deletion_record["supabase_deleted"] = response.status_code < 400
            if response.status_code >= 400:
                deletion_record["supabase_delete_status"] = response.status_code
        except Exception:
            deletion_record["supabase_deleted"] = False

    append_runtime_jsonl("account_deletions.jsonl", deletion_record)
    return {
        "ok": True,
        "message": "Account deletion was processed. Local browser data should now be cleared by the client.",
        "deletion": deletion_record,
    }
