import { useEffect, useRef, useState } from "react";
import {
  getTurnstileSiteKey,
  loadTurnstile,
  type TurnstileApi,
  type TurnstileAction,
  type TurnstileControl,
} from "@/lib/turnstile";
import { cn } from "@/lib/utils";

interface TurnstileWidgetProps {
  action: TurnstileAction;
  control: TurnstileControl;
  className?: string;
}

type WidgetSize = "compact" | "flexible";

export function TurnstileWidget({ action, control, className }: TurnstileWidgetProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measuredSizeRef = useRef<WidgetSize | null>(null);
  const generationRef = useRef(0);
  const [{ size, generation }, setMeasurement] = useState<{
    size: WidgetSize | null;
    generation: number;
  }>({ size: null, generation: 0 });
  const sitekey = getTurnstileSiteKey();
  const { resetKey, onVerify, onExpire, onTimeout, onError, invalidateToken } = control;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let active = true;
    const updateSize = (width: number) => {
      if (!active) return;
      const nextSize = width <= 0 ? null : width >= 300 ? "flexible" : "compact";
      if (nextSize === measuredSizeRef.current) return;

      measuredSizeRef.current = nextSize;
      generationRef.current += 1;
      invalidateToken();
      setMeasurement({ size: nextSize, generation: generationRef.current });
    };

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(([entry]) => {
        if (entry) updateSize(entry.contentRect.width);
      });
      observer.observe(wrapper);
      return () => {
        active = false;
        observer.disconnect();
      };
    }

    const measure = () => updateSize(wrapper.getBoundingClientRect().width);
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [invalidateToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (!sitekey || !container || !size) return;

    let active = true;
    const isCurrent = () => active && generation === generationRef.current;
    let api: TurnstileApi | undefined;
    let widgetId: string | undefined;

    void loadTurnstile().then((loadedApi) => {
      if (!isCurrent()) return;
      api = loadedApi;
      widgetId = api.render(container, {
        sitekey,
        action,
        theme: "light",
        size,
        "response-field": false,
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
        callback: (token) => { if (isCurrent()) onVerify(token); },
        "expired-callback": () => { if (isCurrent()) onExpire(); },
        "timeout-callback": () => { if (isCurrent()) onTimeout(); },
        "unsupported-callback": () => {
          if (isCurrent()) onError("Security check is unavailable in this browser. Try another browser.");
        },
        "error-callback": () => {
          if (isCurrent()) onError();
          return true;
        },
      });
      if (!widgetId) throw new Error("Security check could not start. Please try again.");
    }).catch(() => {
      if (!isCurrent()) return;
      container.replaceChildren();
      onError("Security check could not load. Check your connection and try again.");
    });

    return () => {
      active = false;
      if (api && widgetId) {
        try {
          api.remove(widgetId);
        } catch {
          container.replaceChildren();
        }
      } else {
        container.replaceChildren();
      }
    };
  }, [action, sitekey, size, generation, resetKey, onVerify, onExpire, onTimeout, onError]);

  return (
    <div ref={wrapperRef} className={cn("w-full min-w-0 space-y-2", className)}>
      <div
        ref={containerRef}
        className={cn(
          "min-w-0",
          size === "compact" ? "mx-auto w-[150px]" : "w-full",
        )}
      />
      {control.error && (
        <div className="space-y-1.5">
          <p role="alert" className="text-xs font-medium text-rm-trip-error">{control.error}</p>
          {sitekey && (
            <button
              type="button"
              onClick={control.retry}
              className="text-xs font-semibold text-rm-trip-highlight hover:underline"
            >
              Retry security check
            </button>
          )}
        </div>
      )}
      {!control.token && !control.error && (
        <p role="status" className={cn("text-xs text-rm-trip-text-muted", size === "compact" && "text-center")}>
          Completing security check...
        </p>
      )}
    </div>
  );
}
