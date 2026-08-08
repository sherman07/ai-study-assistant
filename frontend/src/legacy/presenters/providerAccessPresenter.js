/**
 * Presenter for plan-gated AI provider selection.
 */
import {
  FREE_DEFAULT_PROVIDER,
  providerSelectOptions,
  providerUpgradeCopy,
  resolveProviderForSession,
  sessionIsPro
} from "../model/providerAccess.js";

export function currentAccountSession() {
  try {
    if (typeof globalThis.getCurrentAccountSession === "function") {
      return globalThis.getCurrentAccountSession();
    }
  } catch {}
  try {
    return globalThis.SynapseAuth?.getStoredSession?.() || null;
  } catch {
    return null;
  }
}

export function clampProviderForCurrentSession(requested = "") {
  return resolveProviderForSession(requested, currentAccountSession());
}

export function providerSettingsOptions() {
  return providerSelectOptions(currentAccountSession());
}

export function providerSettingsDescription() {
  return providerUpgradeCopy(currentAccountSession());
}

export function enforceProviderPreference(requested = "") {
  const resolution = clampProviderForCurrentSession(requested);
  return {
    ...resolution,
    value: resolution.provider || (sessionIsPro(currentAccountSession()) ? "" : FREE_DEFAULT_PROVIDER)
  };
}

export { sessionIsPro, FREE_DEFAULT_PROVIDER };
