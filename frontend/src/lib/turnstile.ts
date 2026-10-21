import { useCallback, useRef, useState } from "react";

export type TurnstileAction = "contact" | "login" | "signup";

interface TurnstileRenderOptions {
  sitekey: string;
  action: TurnstileAction;
  theme: "light";
  size: "compact" | "flexible";
  "response-field": false;
  "refresh-expired": "auto";
  "refresh-timeout": "auto";
  callback(token: string): void;
  "expired-callback"(): void;
  "timeout-callback"(): void;
  "unsupported-callback"(): void;
  "error-callback"(code: string): boolean;
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string | undefined;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_ID = "cloudflare-turnstile-script";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const UNAVAILABLE_MESSAGE = "Security check is unavailable. Please try again later.";
const LOAD_ERROR_MESSAGE = "Security check could not load. Check your connection and try again.";
let scriptPromise: Promise<TurnstileApi> | undefined;

export function getTurnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";
}

/** Keep one script across route changes and permit retry after a loading failure. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeout);
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };

    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      script?.remove();
      reject(new Error(LOAD_ERROR_MESSAGE));
    };

    const onLoad = () => {
      if (settled) return;
      const api = window.turnstile;
      if (!api || typeof api.render !== "function") {
        fail();
        return;
      }

      // The load event runs after api.js is evaluated. Turnstile's ready()
      // rejects asynchronously loaded scripts, even when called after load.
      settled = true;
      cleanup();
      resolve(api);
    };

    const onError = () => fail();
    const timeout = window.setTimeout(fail, 15_000);

    if (window.turnstile) {
      onLoad();
      return;
    }

    const isNewScript = !script;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
    }
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    if (isNewScript) document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = undefined;
    throw error;
  });

  return scriptPromise;
}

export interface TurnstileControl {
  token: string | null;
  error: string | null;
  resetKey: number;
  onVerify(token: string): void;
  onExpire(): void;
  onTimeout(): void;
  onError(message?: string): void;
  invalidateToken(): void;
  consumeToken(): string | null;
  reset(): void;
  retry(): void;
}

/** Each protected form owns one controller; tokens are consumed before its request. */
export function useTurnstile(): TurnstileControl {
  const tokenRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() =>
    getTurnstileSiteKey() ? null : UNAVAILABLE_MESSAGE,
  );
  const [resetKey, setResetKey] = useState(0);

  const invalidateToken = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
  }, []);

  const invalidate = useCallback((message: string) => {
    tokenRef.current = null;
    setToken(null);
    setError(message);
  }, []);

  const onVerify = useCallback((value: string) => {
    if (!value) return;
    tokenRef.current = value;
    setToken(value);
    setError(null);
  }, []);

  const onExpire = useCallback(() => {
    invalidate("Security check expired. Please wait for it to refresh.");
  }, [invalidate]);

  const onTimeout = useCallback(() => {
    invalidate("Security check timed out. Please try again.");
  }, [invalidate]);

  const onError = useCallback((message = "Security check failed. Please try again.") => {
    invalidate(message);
  }, [invalidate]);

  const consumeToken = useCallback(() => {
    const current = tokenRef.current;
    tokenRef.current = null;
    setToken(null);
    return current;
  }, []);

  const reset = useCallback(() => {
    tokenRef.current = null;
    setToken(null);
    setError(getTurnstileSiteKey() ? null : UNAVAILABLE_MESSAGE);
    setResetKey((value) => value + 1);
  }, []);

  return {
    token,
    error,
    resetKey,
    onVerify,
    onExpire,
    onTimeout,
    onError,
    invalidateToken,
    consumeToken,
    reset,
    retry: reset,
  };
}
