/** Synapse landing & auth pages entry (ES module). */
import { initLandingAuth } from "./src/features/auth/landing/init.js";

initLandingAuth(typeof window !== "undefined" ? window : globalThis);
