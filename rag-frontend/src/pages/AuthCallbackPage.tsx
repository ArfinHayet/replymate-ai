import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { setToken, setRefreshToken } from "@/lib/auth";

/**
 * Landing page for the Supabase OAuth redirect.
 *
 * Supabase appends session tokens to the URL as either:
 *   - a URL hash  (#access_token=...&refresh_token=...)  — implicit flow
 *   - a query param (?code=...)                          — PKCE flow (default)
 *
 * `supabase.auth.getSession()` handles both cases automatically.
 * We extract the tokens, persist them into localStorage via the existing
 * auth helpers, then navigate to /chat.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // Guard against double-invocation in React Strict Mode
    if (handled.current) return;
    handled.current = true;

    void (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        toast.error("Google sign-in failed. Please try again.");
        navigate("/login", { replace: true });
        return;
      }

      setToken(data.session.access_token);
      setRefreshToken(data.session.refresh_token);
      navigate("/chat", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[linear-gradient(to_top,_rgba(245,247,250,0.95),_rgba(245,247,250,0.8))]">
      <Loader2 className="h-8 w-8 animate-spin text-rm-trip-brand" />
      <p className="text-sm font-semibold text-gray-600">Completing sign-in…</p>
    </div>
  );
}

export default AuthCallbackPage;
