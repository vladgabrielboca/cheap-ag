import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Credentials come only from saved logins in OpenCode's store, written by `cheapag login` (ADR-0004). */

/** Providers in detection order; `label` is what `cheapag login` shows. */
export const PROVIDERS = [
  { id: "opencode-go", label: "OpenCode Go" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "commandcode", label: "Command Code" },
  { id: "zai-coding-plan", label: "Z.ai Coding Plan" },
] as const;

export type Provider = { provider: (typeof PROVIDERS)[number]["id"]; via: "login" };

export const LOGIN_COMMAND = "npx cheap-agent login";
export const NO_PROVIDER = `FAIL reason: no worker provider; run ${LOGIN_COMMAND}`;

/**
 * The XDG data home the bundled OpenCode runs with: Cheap Agent's own, not the user's. OpenCode keeps its logins and its
 * SQLite database there, and a newer OpenCode the user installed (2.x) migrates that database to a schema the pinned
 * 1.19.0 refuses ("Database is not empty and has no session table"), so the two never share it.
 */
export function opencodeDataHome() {
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "cheapag", "opencode-data");
}

/** The bundled OpenCode's credential store, written by its `auth login`. */
function authFile() {
  return join(opencodeDataHome(), "opencode", "auth.json");
}

/** Supported providers with a saved login, in detection order. Only the provider ids are used; keys are never kept or passed on. */
export function savedProviders(): Provider["provider"][] {
  let saved: Record<string, unknown>;
  try {
    saved = existsSync(authFile()) ? JSON.parse(readFileSync(authFile(), "utf8")) : {};
  } catch {
    return []; // an unreadable auth file is the same as no login
  }
  return PROVIDERS.map((p) => p.id).filter((id) => id in saved);
}

export const providerLabel = (id: Provider["provider"]) => PROVIDERS.find((p) => p.id === id)!.label;

/** The provider the worker uses: the first saved login. */
export function detectProvider(): Provider | undefined {
  const [first] = savedProviders();
  return first && { provider: first, via: "login" };
}

/** Strips key-shaped strings (OpenRouter's sk-or-v1-…, DeepSeek/OpenAI-style sk-…, Z.ai's <32 hex>.<secret>) from anything that leaves the process. */
export function redact(text: string) {
  return text.replace(/\bsk-[A-Za-z0-9_-]{16,}/g, "[redacted]").replace(/\b[0-9a-f]{32}\.[A-Za-z0-9]{8,}/g, "[redacted]");
}
