/** Boot landing/auth page behaviors. */
import { attach as attachFormUtils } from "./formUtils.js";
import { attach as attachAuthStatus } from "./authStatus.js";
import { attach as attachChromeUi } from "./chromeUi.js";
import { attach as attachLoginForm } from "./loginForm.js";
import { attach as attachSignupForm } from "./signupForm.js";
import { attach as attachForgotPasswordForm } from "./forgotPasswordForm.js";
import { attach as attachContactForm } from "./contactForm.js";
import { attach as attachPageEffects } from "./pageEffects.js";

export function initLandingAuth(root = globalThis) {
  const windowObj = root.window || root;
  const documentObj = root.document || windowObj.document;
  if (typeof globalThis.window === "undefined") globalThis.window = windowObj;
  if (typeof globalThis.document === "undefined") globalThis.document = documentObj;

  const api = { window: windowObj, document: documentObj };
  attachFormUtils(api);
  attachAuthStatus(api);
  attachChromeUi(api);
  attachLoginForm(api);
  attachSignupForm(api);
  attachForgotPasswordForm(api);
  attachContactForm(api);
  attachPageEffects(api);
  return api;
}
