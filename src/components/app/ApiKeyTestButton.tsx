import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ShieldCheck, ShieldAlert, FlaskConical } from "lucide-react";
import { probeProvider, type ProbeResult } from "@/services/ai-service";
import { toast } from "sonner";
import { shortError } from "@/lib/errors";

export type KeyTestStatus = "idle" | "testing" | "ok" | "fail";

type ApiKeyTestButtonProps = {
  provider: string;
  apiKey: string;
  className?: string;
  /** compact = icon+label for table rows; full = settings form */
  variant?: "full" | "compact";
  onResult?: (result: ProbeResult) => void;
};

export function ApiKeyTestButton({
  provider,
  apiKey,
  className,
  variant = "full",
  onResult,
}: ApiKeyTestButtonProps) {
  const [status, setStatus] = useState<KeyTestStatus>("idle");
  const [detail, setDetail] = useState<string | null>(null);

  const runTest = async () => {
    if (!apiKey.trim()) {
      setStatus("fail");
      setDetail("Paste an API key first.");
      toast.error("Paste an API key first");
      return;
    }

    setStatus("testing");
    setDetail(null);
    const result = await probeProvider(provider, apiKey);
    onResult?.(result);

    if (result.success) {
      setStatus("ok");
      setDetail(result.model ? `Connected · ${result.model}` : "Connected");
      toast.success("Connection verified", {
        description: result.model
          ? `Auto-selected ${result.model}`
          : "Key is valid.",
      });
    } else {
      setStatus("fail");
      const msg = shortError(result.error || "Test failed", 160);
      setDetail(msg);
      toast.error("Connection failed", { description: msg });
    }
  };

  if (variant === "compact") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={runTest}
        disabled={status === "testing" || !apiKey.trim()}
        className={cn(
          "h-8 px-2.5 text-[10px] font-bold uppercase tracking-widest gap-1.5",
          status === "ok" && "text-primary hover:text-primary",
          status === "fail" && "text-red-400 hover:text-red-400",
          className
        )}
        title={detail || "Test API key"}
      >
        {status === "testing" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "ok" ? (
          <ShieldCheck className="h-3.5 w-3.5" />
        ) : status === "fail" ? (
          <ShieldAlert className="h-3.5 w-3.5" />
        ) : (
          <FlaskConical className="h-3.5 w-3.5" />
        )}
        Test
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={runTest}
        disabled={status === "testing" || !apiKey.trim()}
        className={cn(
          "w-full h-11 rounded-xl border-white/10 bg-white/[0.03] text-[11px] font-bold uppercase tracking-[0.18em] hover:bg-white/[0.06]",
          status === "ok" && "border-primary/30 text-primary",
          status === "fail" && "border-red-500/30 text-red-400"
        )}
      >
        {status === "testing" ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Testing connection…
          </>
        ) : status === "ok" ? (
          <>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verified — test again
          </>
        ) : status === "fail" ? (
          <>
            <ShieldAlert className="w-4 h-4 mr-2" />
            Failed — retry test
          </>
        ) : (
          <>
            <FlaskConical className="w-4 h-4 mr-2" />
            Test connection
          </>
        )}
      </Button>
      {detail && (
        <p
          className={cn(
            "text-[11px] leading-relaxed px-1 break-words",
            status === "ok" ? "text-primary/80" : status === "fail" ? "text-red-400/90" : "text-white/40"
          )}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
