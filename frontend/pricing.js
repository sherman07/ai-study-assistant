(function () {
  const status = document.getElementById("billingStatus");
  const planButtons = Array.from(document.querySelectorAll("[data-checkout-plan]"));
  const boostButtons = Array.from(document.querySelectorAll("[data-boost-pack]"));

  function setStatus(message, type = "info") {
    if (!status) return;
    status.textContent = message || "";
    status.dataset.type = type;
  }

  function authPage(page = "login") {
    return new URL(`${page}.html`, window.location.href).toString();
  }

  function setBusy(busy) {
    [...planButtons, ...boostButtons].forEach(button => {
      button.disabled = busy;
    });
  }

  async function requireSignedIn(message) {
    const auth = window.SynapseAuth;
    const session = auth?.getStoredSession?.();
    if (!session?.email) {
      setStatus(message, "error");
      window.location.href = authPage("login");
      return null;
    }
    return auth;
  }

  async function startCheckout(planId, checkoutMode) {
    const auth = await requireSignedIn("Please sign in before upgrading to Pro.");
    if (!auth) return;
    if (!auth.createCheckoutSession) {
      setStatus("Billing client is not available. Refresh and try again.", "error");
      return;
    }
    setStatus("Opening secure Stripe Checkout...");
    setBusy(true);
    try {
      const checkout = await auth.createCheckoutSession({ planId, checkoutMode });
      if (!checkout?.url) throw new Error("Stripe did not return a Checkout URL.");
      window.location.href = checkout.url;
    } catch (error) {
      setStatus(error.message || "Could not open Stripe Checkout.", "error");
      setBusy(false);
    }
  }

  async function startBoostCheckout(packId) {
    const auth = await requireSignedIn("Please sign in before adding Boost Credits.");
    if (!auth) return;
    if (!auth.createBoostCheckoutSession) {
      setStatus("Boost checkout is not available. Refresh and try again.", "error");
      return;
    }
    setStatus("Opening secure Stripe Checkout for Boost Credits...");
    setBusy(true);
    try {
      const checkout = await auth.createBoostCheckoutSession({ packId });
      if (!checkout?.url) throw new Error("Stripe did not return a Checkout URL.");
      window.location.href = checkout.url;
    } catch (error) {
      setStatus(error.message || "Could not open Boost Checkout.", "error");
      setBusy(false);
    }
  }

  planButtons.forEach(button => {
    button.addEventListener("click", () => {
      const planId = button.dataset.checkoutPlan;
      if (planId === "free") {
        window.location.href = new URL("signup.html", window.location.href).toString();
        return;
      }
      startCheckout(planId, button.dataset.checkoutMode || undefined);
    });
  });

  boostButtons.forEach(button => {
    button.addEventListener("click", () => {
      startBoostCheckout(button.dataset.boostPack);
    });
  });

  window.SynapseAuth?.syncBillingSessionFromServer?.().catch(() => {});
}());
