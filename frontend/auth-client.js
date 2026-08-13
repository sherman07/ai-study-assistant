/** Synapse auth client entry (ES module). */
import { installAuthClient } from "./src/features/auth/client/install.js";

installAuthClient(typeof window !== "undefined" ? window : globalThis);
