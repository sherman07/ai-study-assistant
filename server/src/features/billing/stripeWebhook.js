import { Router } from "express";
import { config } from "../../config.js";
import { boostPack, boostPackByPrice, subscriptionAccessPlan } from "../../billing/plans.js";
import {
  missingStripeConfig,
  stripe,
  stripeConfigured,
  stripeWebhookConfigured
} from "../../billing/stripe.js";
import {
  getUserById,
  getUserByStripeCustomerId,
  getUserByStripeSubscriptionId,
  updateUserStripeCustomer,
  updateUserSubscription
} from "../../repositories/usersRepository.js";
import { asyncRoute } from "../../routes/helpers.js";
import { cleanString } from "../../utils/validators.js";
import {
  configError,
  dateFromStripeSeconds,
  grantBoostCredits,
  planFromSubscription,
  stripeId,
  subscriptionIdFromBillingObject
} from "./helpers.js";

const webhookRouter = Router();

async function updateFromSubscription(subscription) {
  const subscriptionId = stripeId(subscription.id);
  const customerId = stripeId(subscription.customer);
  const user = subscriptionId
    ? await getUserByStripeSubscriptionId(subscriptionId)
    : null;
  const customerUser = !user && customerId ? await getUserByStripeCustomerId(customerId) : null;
  const targetUser = user || customerUser;
  if (!targetUser) return null;

  const status = cleanString(subscription.status, 80) || "inactive";
  const metadataPlan = planFromSubscription(subscription);
  const accessPlan = subscriptionAccessPlan(metadataPlan, status);
  return updateUserSubscription(targetUser.id, {
    stripeCustomerId: customerId || targetUser.stripeCustomerId,
    stripeSubscriptionId: subscriptionId || targetUser.stripeSubscriptionId,
    plan: accessPlan,
    subscriptionStatus: status,
    currentPeriodEnd: dateFromStripeSeconds(subscription.current_period_end)
  });
}

async function updateBoostCheckoutCompleted(session, targetUser) {
  const packId = cleanString(session.metadata?.boost_pack_id || session.metadata?.pack_id, 80);
  const pack = boostPack(packId) || boostPackByPrice(cleanString(session.metadata?.price_id, 255));
  const credits = Number(session.metadata?.boost_credits || pack?.credits || 0);
  if (!Number.isFinite(credits) || credits <= 0) {
    return updateUserStripeCustomer(targetUser.id, stripeId(session.customer) || targetUser.stripeCustomerId);
  }
  if (targetUser.stripeCustomerId !== stripeId(session.customer) && stripeId(session.customer)) {
    await updateUserStripeCustomer(targetUser.id, stripeId(session.customer));
  }
  return grantBoostCredits(targetUser, credits, {
    type: "boost_pack",
    packId: pack?.id || packId,
    sessionId: session.id
  });
}

async function updateCheckoutCompleted(session) {
  const userId = cleanString(session.metadata?.user_id, 80);
  const targetUser = userId ? await getUserById(userId) : null;
  if (!targetUser) return null;

  const customerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);
  const checkoutKind = cleanString(session.metadata?.checkout_kind || session.metadata?.type, 40);

  if (checkoutKind === "boost" || session.metadata?.boost_pack_id) {
    if (session.payment_status && session.payment_status !== "paid") {
      return updateUserStripeCustomer(targetUser.id, customerId);
    }
    return updateBoostCheckoutCompleted(session, targetUser);
  }

  if (session.mode === "subscription" && subscriptionId) {
    const subscription = await stripe().subscriptions.retrieve(subscriptionId);
    return updateFromSubscription(subscription);
  }

  if (session.mode === "payment") {
    if (session.payment_status && session.payment_status !== "paid") {
      return updateUserStripeCustomer(targetUser.id, customerId);
    }
    const plan = cleanString(session.metadata?.plan, 80) || "pro_yearly";
    if (plan.startsWith("boost") || checkoutKind === "boost") {
      return updateBoostCheckoutCompleted(session, targetUser);
    }
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    return updateUserSubscription(targetUser.id, {
      stripeCustomerId: customerId || targetUser.stripeCustomerId,
      stripeSubscriptionId: null,
      plan,
      subscriptionStatus: "active",
      currentPeriodEnd: periodEnd
    });
  }

  return updateUserStripeCustomer(targetUser.id, customerId);
}

async function markSubscriptionInactive(eventObject, status = "inactive") {
  const subscriptionId = subscriptionIdFromBillingObject(eventObject);
  const customerId = stripeId(eventObject.customer);
  const user = subscriptionId
    ? await getUserByStripeSubscriptionId(subscriptionId)
    : null;
  const customerUser = !user && customerId ? await getUserByStripeCustomerId(customerId) : null;
  const targetUser = user || customerUser;
  if (!targetUser) return null;
  return updateUserSubscription(targetUser.id, {
    stripeCustomerId: customerId || targetUser.stripeCustomerId,
    stripeSubscriptionId: subscriptionId || targetUser.stripeSubscriptionId,
    plan: "free",
    subscriptionStatus: status,
    currentPeriodEnd: null
  });
}

webhookRouter.post("/", asyncRoute(async (req, res) => {
  if (!stripeConfigured() || !stripeWebhookConfigured()) {
    return configError(res, missingStripeConfig().filter(name => name === "STRIPE_SECRET_KEY" || name === "STRIPE_WEBHOOK_SECRET"));
  }
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
  } catch (error) {
    return res.status(400).json({ ok: false, error: `Webhook signature verification failed: ${error.message}` });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await updateCheckoutCompleted(event.data.object);
      break;
    case "checkout.session.async_payment_succeeded":
      await updateCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await updateFromSubscription(event.data.object);
      break;
    case "customer.subscription.deleted":
      await markSubscriptionInactive(event.data.object, "canceled");
      break;
    case "invoice.payment_failed":
      await markSubscriptionInactive(event.data.object, "past_due");
      break;
    default:
      break;
  }

  res.json({ ok: true, received: true });
}));

export { webhookRouter as billingWebhookRouter };
