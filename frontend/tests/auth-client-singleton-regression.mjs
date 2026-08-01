import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = fs.readFileSync(path.join(repoRoot, "frontend/auth-client.js"), "utf8");

assert.match(source, /let supabaseClientPromise = null;/, "auth client should track in-flight Supabase creation");
assert.match(source, /if \(supabaseClientPromise\) return supabaseClientPromise;/, "callers should share in-flight Supabase creation");
assert.match(source, /supabaseClientPromise = \(async \(\) => \{/ , "Supabase creation should be guarded by one promise");
assert.match(source, /supabaseClientPromise = null;/, "failed or completed creation should release the in-flight lock");

console.log("auth client singleton regression passed");
