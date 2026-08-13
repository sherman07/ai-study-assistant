/** Shared mutable auth-client state. */
export const SESSION_KEY = "synapse.auth.session.v1";
export const LAST_EMAIL_KEY = "synapse.auth.lastEmail.v1";
export const REMEMBER_ME_KEY = "synapse.auth.rememberMe.v1";
export const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
export const LOCAL_INDEXED_DB_NAMES = [
  "synapse.visual.assets.v1",
  "synapse.source.assets.v1"
];

export const authState = {
  supabaseClient: null,
  supabaseClientPromise: null,
  supabaseScriptPromise: null,
  billingSyncTimer: null,
  billingSyncInFlight: null
};
