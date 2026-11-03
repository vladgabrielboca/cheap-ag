import { afterAll, vi } from "vitest";
import { homes, removeDir } from "./harness.js";

// Windows CI runs ~3x slower; vi.waitFor's 1000 ms default is too short there.
if (process.platform === "win32") {
  const waitFor = vi.waitFor;
  vi.waitFor = (callback, options) =>
    waitFor(callback, {
      ...(typeof options === "object" ? options : {}),
      timeout: (typeof options === "number" ? options : options?.timeout ?? 1000) * 3,
    });
}

// Registered first, so it runs after every test file's own afterAll (which stops the OpenCode servers using the homes).
// Many tests and suites made a hermetic home and never removed it: up to 150 MB each, ~25 per full run, left in /tmp.
afterAll(() => {
  for (const home of homes) removeDir(home);
  homes.clear();
});
