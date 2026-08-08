import assert from "node:assert/strict";
import { test } from "node:test";

import { createApp } from "../src/app.js";

test("disallowed CORS origins return a safe 403 response", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await new Promise(resolve => server.once("listening", resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { Origin: "https://evil.example" }
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.ok, false);
    assert.equal(payload.error, "CORS origin is not allowed.");
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
