import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("local login repair is explicitly enabled and restricted to localhost", () => {
  const login = readFileSync(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
  assert.match(login, /LOCAL_DEV_LOGIN !== "enabled"/);
  assert.match(login, /isLocalhostRequest\(request\)/);
  assert.match(auth, /hostname === "localhost"/);
  assert.match(auth, /hostname === "127\.0\.0\.1"/);
  assert.match(auth, /hostname === "::1"/);
  assert.doesNotMatch(auth, /210_000/);
});
