import React, { useState } from "react";
import {
  Loader2,
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  FileCode,
  Brain,
  Wrench,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export type AgentStepStatus = "pending" | "active" | "done";

export type AgentStep = {
  id: string;
  label: string;
  detail?: string;
  status: AgentStepStatus;
  kind?: "think" | "tool" | "file" | "status";
};

type AgentActivityCardProps = {
  steps: AgentStep[];
  thought?: string;
  progress?: number;
  isGenerating: boolean;
};

function StepIcon({ status, kind }: { status: AgentStepStatus; kind?: AgentStep["kind"] }) {
  if (status === "done") {
    return <Check className="w-3 h-3 text-primary shrink-0" />;
  }
  if (status === "active") {
    return <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />;
  }
  if (kind === "think") return <Brain className="w-3 h-3 text-white/25 shrink-0" />;
  if (kind === "file") return <FileCode className="w-3 h-3 text-white/25 shrink-0" />;
  if (kind === "tool") return <Wrench className="w-3 h-3 text-white/25 shrink-0" />;
  return <Circle className="w-2.5 h-2.5 text-white/20 shrink-0" />;
}

export const AgentActivityCard: React.FC<AgentActivityCardProps> = ({
  steps,
  thought,
  progress = 0,
  isGenerating,
}) => {
  const [thoughtOpen, setThoughtOpen] = useState(true);
  const active = steps.find((s) => s.status === "active");
  const doneCount = steps.filter((s) => s.status === "done").length;

  if (!isGenerating && steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.06]">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-white/80 truncate">
            {isGenerating
              ? active?.label || "Working…"
              : `Finished · ${doneCount} step${doneCount === 1 ? "" : "s"}`}
          </div>
          {active?.detail && (
            <div className="text-[10px] text-white/35 font-mono truncate mt-0.5">{active.detail}</div>
          )}
        </div>
        {isGenerating && (
          <span className="text-[10px] font-mono tabular-nums text-white/30 shrink-0">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {thought && (
        <button
          type="button"
          onClick={() => setThoughtOpen((o) => !o)}
          className="w-full px-3 py-2 flex items-center gap-1.5 text-left border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
        >
          {thoughtOpen ? (
            <ChevronDown className="w-3 h-3 text-white/30" />
          ) : (
            <ChevronRight className="w-3 h-3 text-white/30" />
          )}
          <Brain className="w-3 h-3 text-violet-400/70" />
          <span className="text-[10px] font-medium text-white/45 uppercase tracking-wider">
            Thinking
          </span>
        </button>
      )}

      <AnimatePresence initial={false}>
        {thought && thoughtOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2.5 text-[12px] leading-relaxed text-white/50 border-b border-white/[0.06] whitespace-pre-wrap break-words">
              {thought}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {steps.length > 0 && (
        <div className="px-2 py-1.5 max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                step.status === "active" && "bg-primary/[0.06]",
                step.status === "done" && "opacity-70",
                step.status === "pending" && "opacity-40"
              )}
            >
              <div className="mt-0.5">
                <StepIcon status={step.status} kind={step.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "leading-snug",
                    step.status === "active" ? "text-white/85" : "text-white/55"
                  )}
                >
                  {step.label}
                </div>
                {step.detail && step.status !== "active" && (
                  <div className="text-[10px] font-mono text-white/25 truncate mt-0.5">
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isGenerating && (
        <div className="h-0.5 bg-white/[0.04]">
          <div
            className="h-full bg-primary/80 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(progress, 3)}%` }}
          />
        </div>
      )}
    </div>
  );
};
