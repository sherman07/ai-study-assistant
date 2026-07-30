const PRIMARY_CONTROLLER_EMAIL = "shermanzheng8@gmail.com";
const SESSION_KEY = "synapse.auth.session.v1";

function readAuthSession() {
  const fromAuth = globalThis.window?.SynapseAuth?.getStoredSession?.();
  if (fromAuth && typeof fromAuth === "object" && (fromAuth.email || fromAuth.accountId)) {
    return fromAuth;
  }
  for (const storage of [globalThis.window?.sessionStorage, globalThis.window?.localStorage]) {
    try {
      const raw = storage?.getItem?.(SESSION_KEY);
      const session = raw ? JSON.parse(raw) : null;
      if (session && typeof session === "object" && (session.email || session.accountId)) {
        return session;
      }
    } catch {}
  }
  return null;
}

function accountInitials(session) {
  const name = String(session?.displayName || session?.email || "Guest Student").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (name.slice(0, 2) || "GS").toUpperCase();
}

function isControllerSession(session) {
  const email = String(session?.email || "").trim().toLowerCase();
  return Boolean(
    session?.isController
    || session?.platformRole === "controller"
    || email === PRIMARY_CONTROLLER_EMAIL
  );
}

function useAccountSession() {
  const React = globalThis.React;
  const [session, setSession] = React.useState(() => readAuthSession());

  React.useEffect(() => {
    let cancelled = false;

    const refresh = (next) => {
      if (cancelled) return;
      setSession(next && typeof next === "object" ? next : readAuthSession());
    };

    const onAuthChanged = (event) => {
      refresh(event?.detail?.session ?? readAuthSession());
    };

    window.addEventListener("synapse-auth-changed", onAuthChanged);
    window.addEventListener("synapse-runtime-ready", () => refresh(readAuthSession()));
    window.addEventListener("synapse-combined-controller-ready", () => refresh(readAuthSession()));

    const sync = window.SynapseAuth?.syncSessionFromProvider?.();
    if (sync?.then) {
      sync.then((next) => refresh(next)).catch(() => refresh(readAuthSession()));
    } else {
      refresh(readAuthSession());
    }

    const timer = window.setInterval(() => refresh(readAuthSession()), 4000);

    return () => {
      cancelled = true;
      window.removeEventListener("synapse-auth-changed", onAuthChanged);
      window.clearInterval(timer);
    };
  }, []);

  return session;
}

export {
  PRIMARY_CONTROLLER_EMAIL,
  accountInitials,
  isControllerSession,
  readAuthSession,
  useAccountSession
};
