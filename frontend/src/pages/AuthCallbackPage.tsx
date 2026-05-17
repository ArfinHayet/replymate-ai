import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { setToken, setRefreshToken } from "@/lib/auth";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
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
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-rm-trip-surface px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(20,184,166,0.12),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#eef4ff_48%,#f8fafc_100%)]" />
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-rm-trip-smooth border border-white/80 bg-white/95 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur">
        <Loader2 className="h-8 w-8 animate-spin text-rm-trip-brand" />
        <p className="text-sm font-semibold text-rm-trip-text">Completing sign-in...</p>
        <p className="text-xs font-medium text-rm-trip-text-muted">You will be redirected automatically.</p>
      </div>
    </div>
  );
}

export default AuthCallbackPage;
