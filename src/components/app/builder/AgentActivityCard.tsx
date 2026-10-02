import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Check,
  Circle,
  ChevronRight,
  FileCode,
  Brain,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  /** Live narration lines while working */
  liveLog?: string[];
  progress?: number;
  isGenerating: boolean;
  moodLabel?: string;
  moodEmoji?: string;
};

function StepIcon({ status, kind }: { status: AgentStepStatus; kind?: AgentStep["kind"] }) {
  if (status === "done") {
    return <Check className="w-3 h-3 text-emerald-400/80 shrink-0" />;
  }
  if (status === "active") {
    return <Loader2 className="w-3 h-3 text-white/55 animate-spin shrink-0" />;
  }
  if (kind === "think") return <Brain className="w-3 h-3 text-white/20 shrink-0" />;
  if (kind === "file") return <FileCode className="w-3 h-3 text-white/20 shrink-0" />;
  if (kind === "tool") return <Wrench className="w-3 h-3 text-white/20 shrink-0" />;
  return <Circle className="w-2.5 h-2.5 text-white/15 shrink-0" />;
}

/**
 * Cursor-style agent activity — one stable panel.
 * Thought streams visibly (collapsed height) while waiting / generating.
 */
export const AgentActivityCard: React.FC<AgentActivityCardProps> = ({
  steps,
  thought,
  liveLog = [],
  progress = 0,
  isGenerating,
  moodLabel,
  moodEmoji,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [thoughtExpanded, setThoughtExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const thoughtRef = useRef<HTMLDivElement>(null);
  const active = steps.find((s) => s.status === "active");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const latestLine = liveLog[liveLog.length - 1] || "";
  const visibleSteps = steps
    .filter((s) => s.status !== "pending" || s.id === active?.id)
    .slice(-8);
  const recentLog = liveLog.slice(-6);
  const showThought = Boolean(thought) || isGenerating;

  useEffect(() => {
    if (isGenerating) {
      setExpanded(true);
      setThoughtExpanded(false); // keep thought compact like Cursor
    }
  }, [isGenerating]);

  useEffect(() => {
    if (!expanded || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [recentLog.length, visibleSteps.length, expanded]);

  // Keep thought preview pinned to the latest drip without layout shake
  useEffect(() => {
    if (!thoughtRef.current || thoughtExpanded) return;
    thoughtRef.current.scrollTop = thoughtRef.current.scrollHeight;
  }, [thought, thoughtExpanded]);

  if (!isGenerating && steps.length === 0 && !thought && liveLog.length === 0) return null;

  const headline = isGenerating
    ? active?.label || "Working…"
    : `Done · ${doneCount} step${doneCount === 1 ? "" : "s"}`;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0b] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 text-white/45 animate-spin shrink-0" />
        ) : (
          <Check className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-white/80 truncate">{headline}</div>
          {!expanded && (thought || latestLine) && (
            <div className="text-[11px] text-white/35 truncate mt-0.5">
              {thought ? thought.replace(/\s+/g, " ").slice(-90) : latestLine}
            </div>
          )}
          {expanded && (moodEmoji || moodLabel) && (
            <div className="text-[10px] text-white/30 mt-0.5 truncate">
              {[moodEmoji, moodLabel].filter(Boolean).join(" ")}
              {isGenerating ? " · live" : ""}
            </div>
          )}
        </div>
        {isGenerating && (
          <span className="text-[10px] font-mono tabular-nums text-white/25 shrink-0">
            {Math.round(progress)}%
          </span>
        )}
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-white/30 shrink-0 transition-transform duration-150",
            expanded && "rotate-90"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06]">
          {showThought && (
            <div className="border-b border-white/[0.05]">
              <button
                type="button"
                onClick={() => setThoughtExpanded((o) => !o)}
                className="w-full px-3 py-1.5 flex items-center gap-1.5 text-left hover:bg-white/[0.015]"
              >
                <Brain className="w-3 h-3 text-white/35 shrink-0" />
                <span className="text-[11px] text-white/45">
                  {isGenerating ? "Thinking" : "Thought"}
                </span>
                {isGenerating && (
                  <span className="text-[10px] text-white/25">streaming</span>
                )}
                <ChevronRight
                  className={cn(
                    "w-3 h-3 text-white/25 ml-auto shrink-0 transition-transform duration-150",
                    thoughtExpanded && "rotate-90"
                  )}
                />
              </button>
              {/* Always show a compact live preview — Cursor-style, no empty wait */}
              <div
                ref={thoughtRef}
                className={cn(
                  "px-3 pb-2.5 text-[11.5px] leading-relaxed text-white/50 whitespace-pre-wrap break-words custom-scrollbar",
                  thoughtExpanded ? "max-h-40 overflow-y-auto" : "max-h-[3.6rem] overflow-hidden"
                )}
              >
                {thought || (isGenerating ? "Connecting to the model…" : "")}
                {isGenerating && (
                  <span className="inline-block w-1.5 h-3 ml-0.5 bg-white/35 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )}

          <div
            ref={listRef}
            className="px-3 py-2 max-h-[148px] overflow-y-auto custom-scrollbar space-y-2"
          >
            {recentLog.length > 0 && (
              <div className="space-y-1">
                {recentLog.map((line, i) => (
                  <p
                    key={`log-${liveLog.length - recentLog.length + i}`}
                    className={cn(
                      "text-[11.5px] leading-snug",
                      i === recentLog.length - 1 && isGenerating
                        ? "text-white/65"
                        : "text-white/35"
                    )}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}

            {visibleSteps.length > 0 && (
              <div className="space-y-0.5 pt-0.5">
                {visibleSteps.map((step) => (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px]",
                      step.status === "active" && "bg-white/[0.03]"
                    )}
                  >
                    <div className="mt-0.5">
                      <StepIcon status={step.status} kind={step.kind} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "leading-snug truncate",
                          step.status === "active" ? "text-white/75" : "text-white/40"
                        )}
                      >
                        {step.label}
                      </div>
                      {step.detail && step.status === "active" && (
                        <div className="text-[10px] font-mono text-white/20 truncate">
                          {step.detail}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isGenerating && (
            <div className="h-px bg-white/[0.04]">
              <div
                className="h-full bg-white/25 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
