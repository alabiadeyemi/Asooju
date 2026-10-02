import { ClipboardCopy, Circle, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ShipChecklist } from "@/lib/ship-checklist";
import { copyShipText } from "@/lib/ship-checklist";
import { cn } from "@/lib/utils";

type Props = {
  checklist: ShipChecklist;
  disabled?: boolean;
};

export function ShipChecklistPanel({ checklist, disabled }: Props) {
  const onCopy = async (text: string | undefined, label: string) => {
    if (!text?.trim()) {
      toast.message("Nothing to copy");
      return;
    }
    const ok = await copyShipText(text);
    if (ok) toast.success(`Copied ${label}`);
    else toast.error("Copy failed", { description: "Allow clipboard access for this site." });
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-white/40 leading-relaxed border border-white/5 rounded-xl px-3 py-2.5 bg-white/[0.02]">
        {checklist.previewNote}
      </p>
      <ol className="space-y-3">
        {checklist.items.map((item, idx) => (
          <li
            key={item.id}
            className="flex gap-3 rounded-xl border border-white/[0.06] bg-[#0a0a0a]/60 px-3 py-3"
          >
            <div className="pt-0.5 shrink-0">
              {item.done ? (
                <CircleCheck className="w-4 h-4 text-emerald-500/90" />
              ) : (
                <Circle className="w-4 h-4 text-white/25" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                {idx + 1}. {item.title}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{item.detail}</p>
              {item.copyText && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  className={cn(
                    "mt-2 h-7 px-2 text-[10px] uppercase tracking-wider text-primary hover:text-primary"
                  )}
                  onClick={() => void onCopy(item.copyText, item.copyLabel || "text")}
                >
                  <ClipboardCopy className="w-3 h-3 mr-1.5" />
                  {item.copyLabel || "Copy"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
