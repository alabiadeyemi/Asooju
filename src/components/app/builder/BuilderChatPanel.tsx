import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Send,
  Paperclip,
  X,
  FileText,
  Zap,
  ListChecks,
  Hammer,
  MessageSquare,
  Check,
  Square,
  Undo2,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AgentActivityCard,
  type AgentStep,
} from "@/components/app/builder/AgentActivityCard";
import {
  filesToAttachments,
  shouldCollapsePaste,
  textToPasteAttachment,
  MAX_ATTACHMENTS,
  type ChatAttachment,
} from "@/lib/attachments";
import type {
  AgentChatMode,
  BuildPlan,
  ClarifyingQuestion,
} from "@/lib/agent-procedure";
import { buildChatSuggestions } from "@/lib/chat-suggestions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  attachments?: ChatAttachment[];
  meta?: {
    autoFix?: boolean;
    files?: string[];
    kind?: "plan" | "checkpoint" | "status";
    plan?: BuildPlan;
    stream?: boolean;
    mood?: string;
    checkpoint?: {
      wave: number;
      maxWaves: number;
      files: string[];
      nextPaths?: string[];
      hasMore: boolean;
    };
  };
};

interface BuilderChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendMessage: (
    customPrompt?: string,
    opts?: { attachments?: ChatAttachment[]; source?: "user" | "autofix" }
  ) => void;
  thought?: string;
  liveLog?: string[];
  moodLabel?: string;
  moodEmoji?: string;
  steps?: AgentStep[];
  progress?: number;
  autoFixEnabled?: boolean;
  onToggleAutoFix?: () => void;
  creditsLabel?: string;
  agentMode?: AgentChatMode;
  onAgentModeChange?: (mode: AgentChatMode) => void;
  onApprovePlan?: () => void;
  onContinueWave?: () => void;
  onPauseProcedure?: () => void;
  onAnswerQuestion?: (questionId: string, answer: string) => void;
  pendingAnswers?: Record<string, string>;
  planInteractive?: boolean;
  checkpointInteractive?: boolean;
  vfs?: Record<string, string>;
  previewError?: string;
  procedurePhase?: string;
  hasMoreWaves?: boolean;
  onStop?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  queuedCount?: number;
  briefApprovalVisible?: boolean;
  briefReady?: boolean;
  briefSummary?: string;
  onApproveBrief?: () => void;
}

function MessageBody({ content, stream }: { content: string; stream?: boolean }) {
  const [shown, setShown] = useState(stream ? "" : content);
  const [done, setDone] = useState(!stream);

  useEffect(() => {
    if (!stream) {
      setShown(content);
      setDone(true);
      return;
    }
    setShown("");
    setDone(false);
    let i = 0;
    const chunk = Math.max(2, Math.ceil(content.length / 80));
    const id = window.setInterval(() => {
      i = Math.min(content.length, i + chunk);
      setShown(content.slice(0, i));
      if (i >= content.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [content, stream]);

  const lines = shown.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (
          line === "Plan" ||
          line === "Files" ||
          line === "What I aimed for" ||
          line === "Files touched" ||
          line === "Along the way"
        ) {
          return (
            <div
              key={i}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 pt-2 first:pt-0"
            >
              {line}
            </div>
          );
        }
        if (/^\d+\.\s/.test(line) || line.startsWith("• ")) {
          return (
            <div key={i} className="text-[12px] text-white/60 font-mono pl-0.5">
              {line}
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        return (
          <p key={i} className="text-[12.5px] leading-relaxed text-inherit">
            {line}
            {!done && i === lines.length - 1 && (
              <span className="inline-block w-1.5 h-3 ml-0.5 bg-white/35 animate-pulse align-middle" />
            )}
          </p>
        );
      })}
    </div>
  );
}

function PlanCard({
  plan,
  pendingAnswers,
  disabled,
  onAnswer,
  onApprove,
}: {
  plan: BuildPlan;
  pendingAnswers: Record<string, string>;
  disabled?: boolean;
  onAnswer?: (id: string, answer: string) => void;
  onApprove?: () => void;
}) {
  return (
    <div className="mt-2.5 rounded-lg border border-white/[0.08] bg-black/25 overflow-hidden">
      <div className="px-2.5 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
        <ListChecks className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Build plan
        </span>
        <span className="ml-auto text-[9px] font-mono text-white/30 uppercase">
          {plan.scale}
        </span>
      </div>

      {plan.waves.length > 0 && (
        <div className="px-2.5 py-2 space-y-2">
          {plan.waves.map((w, i) => (
            <div key={i} className="text-[11px]">
              <div className="text-white/70 font-medium">
                {i + 1}. {w.title}
              </div>
              <ul className="mt-0.5 space-y-0.5">
                {w.goals.map((g, j) => (
                  <li key={j} className="text-white/40 pl-2 font-mono text-[10px]">
                    · {g}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {plan.questions.length > 0 && (
        <div className="px-2.5 py-2 border-t border-white/[0.06] space-y-3">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-white/35">
            Quick decisions
          </div>
          {plan.questions.map((q: ClarifyingQuestion) => (
            <div key={q.id}>
              <div className="text-[11px] text-white/65 mb-1.5">{q.prompt}</div>
              <div className="flex flex-wrap gap-1">
                {q.options.map((opt) => {
                  const selected = pendingAnswers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={disabled}
                      onClick={() => onAnswer?.(q.id, opt)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] border transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-white/10 text-white/45 hover:border-white/25 hover:text-white/70"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-2.5 py-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={onApprove}
          className="h-7 text-[11px] rounded-lg bg-white text-black hover:bg-white/90"
        >
          <Check className="w-3 h-3 mr-1" />
          Approve & build
        </Button>
        <span className="text-[10px] text-white/30 self-center px-1">
          or reply with changes
        </span>
      </div>
    </div>
  );
}

function BriefApprovalCard({
  ready,
  summary,
  disabled,
  onApprove,
}: {
  ready: boolean;
  summary?: string;
  disabled?: boolean;
  onApprove?: () => void;
}) {
  return (
    <div className="mt-2.5 rounded-xl border border-white/10 bg-[#0c0c0e] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Brief gate
        </p>
        <p className="text-[11px] text-white/55 mt-1 leading-relaxed">
          {ready
            ? "Brief looks clear enough to build. I won’t write files until you approve — even in Build mode."
            : "Still clarifying the product. Add type, audience, and must-have screen — then approve."}
        </p>
        {summary && ready && (
          <p className="text-[10px] text-white/35 mt-2 line-clamp-4 font-mono">{summary.slice(0, 320)}</p>
        )}
      </div>
      <div className="px-2.5 py-2 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          disabled={disabled || !ready}
          onClick={onApprove}
          className="h-7 text-[11px] rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-40"
        >
          <Check className="w-3 h-3 mr-1" />
          Approve brief & build
        </Button>
      </div>
    </div>
  );
}

function CheckpointCard({
  hasMore,
  disabled,
  autonomous,
  onContinue,
  onPause,
}: {
  hasMore: boolean;
  disabled?: boolean;
  autonomous?: boolean;
  onContinue?: () => void;
  onPause?: () => void;
}) {
  if (!hasMore) return null;
  if (autonomous) {
    return (
      <div className="mt-2 text-[10px] text-white/35">
        Auto-continues only when preview is healthy…
        <button
          type="button"
          disabled={disabled}
          onClick={onPause}
          className="ml-2 text-white/50 hover:text-white/70 underline-offset-2 hover:underline"
        >
          Pause
        </button>
      </div>
    );
  }
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={onContinue}
        className="h-7 text-[11px] rounded-lg bg-white text-black hover:bg-white/90"
      >
        Continue next step
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        onClick={onPause}
        className="h-7 text-[11px] text-white/45 hover:text-white/70"
      >
        Pause here
      </Button>
    </div>
  );
}

/** Claude / AI Studio style: paste collapses to a chip, not raw dump */
function PasteChip({
  attachment,
  expanded,
  onToggle,
  onRemove,
  dark,
}: {
  attachment: ChatAttachment;
  expanded?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  dark?: boolean;
}) {
  const lines = attachment.lineCount || (attachment.text || "").split("\n").length;
  const label = attachment.name || `Pasted text #${attachment.pasteIndex || 1}`;
  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden max-w-full",
        dark
          ? "border-white/[0.1] bg-white/[0.04]"
          : "border-black/10 bg-black/[0.04]"
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <ClipboardPaste
          className={cn("w-3.5 h-3.5 shrink-0", dark ? "text-white/45" : "text-black/45")}
        />
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "min-w-0 flex-1 text-left text-[11px] font-medium truncate",
            dark ? "text-white/75" : "text-black/75"
          )}
        >
          {label}
          <span className={cn("ml-1.5 font-normal", dark ? "text-white/35" : "text-black/35")}>
            · {lines} line{lines === 1 ? "" : "s"}
          </span>
        </button>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn("p-0.5", dark ? "text-white/35 hover:text-white/60" : "text-black/35")}
            title={expanded ? "Collapse" : "Preview"}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              "p-0.5 rounded-md",
              dark ? "text-white/30 hover:text-white/70" : "text-black/30 hover:text-black/70"
            )}
            title="Remove paste"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {expanded && attachment.text && (
        <pre
          className={cn(
            "max-h-40 overflow-auto px-2.5 pb-2 text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-words border-t",
            dark
              ? "border-white/[0.06] text-white/45"
              : "border-black/[0.06] text-black/50"
          )}
        >
          {attachment.text.slice(0, 4000)}
          {attachment.text.length > 4000 ? "\n…" : ""}
        </pre>
      )}
    </div>
  );
}

function SuggestionRail({
  suggestions,
  disabled,
  onPick,
}: {
  suggestions: ReturnType<typeof buildChatSuggestions>;
  disabled?: boolean;
  onPick: (s: { label: string; prompt: string; send?: boolean }) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="mb-2 -mx-0.5">
      <div
        className="flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 custom-scrollbar"
        style={{ scrollbarWidth: "thin" }}
      >
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s)}
            className={cn(
              "shrink-0 rounded-md border px-2 py-1 text-[10.5px] leading-none transition-colors",
              "border-white/[0.08] bg-white/[0.03] text-white/55",
              "hover:border-white/18 hover:bg-white/[0.06] hover:text-white/80",
              "disabled:opacity-40 disabled:pointer-events-none",
              "whitespace-nowrap"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const BuilderChatPanel: React.FC<BuilderChatPanelProps> = ({
  messages,
  isGenerating,
  chatInput,
  setChatInput,
  handleSendMessage,
  thought = "",
  liveLog = [],
  moodLabel,
  moodEmoji,
  steps = [],
  progress = 0,
  autoFixEnabled = true,
  onToggleAutoFix,
  creditsLabel,
  agentMode = "talk",
  onAgentModeChange,
  onApprovePlan,
  onContinueWave,
  onPauseProcedure,
  onAnswerQuestion,
  pendingAnswers = {},
  planInteractive = false,
  checkpointInteractive = false,
  vfs = {},
  previewError = "",
  procedurePhase = "idle",
  hasMoreWaves = false,
  onStop,
  onUndo,
  canUndo = false,
  queuedCount = 0,
  briefApprovalVisible = false,
  briefReady = false,
  briefSummary = "",
  onApproveBrief,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [expandedPasteId, setExpandedPasteId] = useState<string | null>(null);
  const pasteSerialRef = useRef(0);
  const [suggestionsOn, setSuggestionsOn] = useState(
    () => localStorage.getItem("shipkernel_chat_suggestions") !== "0"
  );

  useEffect(() => {
    // Only follow chat on messages / generation start-stop — NOT on thought/log/steps
    // (those update constantly and smooth-scroll shakes the whole panel)
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length, isGenerating, attachments.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [chatInput]);

  useEffect(() => {
    localStorage.setItem("shipkernel_chat_suggestions", suggestionsOn ? "1" : "0");
  }, [suggestionsOn]);

  const suggestions = useMemo(() => {
    if (!suggestionsOn) return [];
    return buildChatSuggestions({
      vfs,
      previewError,
      agentMode,
      phase: procedurePhase,
      hasMoreWaves,
    });
  }, [suggestionsOn, vfs, previewError, agentMode, procedurePhase, hasMoreWaves]);

  const addFiles = async (list: FileList | File[] | null) => {
    if (!list || !list.length) return;
    try {
      const next = await filesToAttachments(list, attachments.length);
      setAttachments((prev) => [...prev, ...next].slice(0, MAX_ATTACHMENTS));
    } catch (e: any) {
      toast.error(e?.message || "Could not attach file");
    }
  };

  const send = () => {
    const pastes = attachments.filter((a) => a.kind === "paste");
    const pasteRefs = pastes
      .map((a) => `[${a.name}${a.lineCount ? ` · ${a.lineCount} lines` : ""}]`)
      .join(" ");
    const typed = chatInput.trim();
    if (!typed && !attachments.length) return;

    const prompt =
      typed ||
      (pastes.length
        ? `Use the attached paste${pastes.length > 1 ? "s" : ""} as the build brief / spec and implement accordingly.`
        : attachments.length
          ? "Use the attached image/file as the design or spec reference and implement it."
          : "");

    const displayPrompt = [typed, pasteRefs].filter(Boolean).join(typed && pasteRefs ? "\n" : "") || prompt;

    handleSendMessage(displayPrompt, {
      attachments: [...attachments],
      source: "user",
    });
    setAttachments([]);
    setExpandedPasteId(null);
    setChatInput("");
  };

  const onPickSuggestion = (s: { label: string; prompt: string; send?: boolean }) => {
    if (s.send) {
      handleSendMessage(s.prompt, { source: "user" });
      return;
    }
    setChatInput(s.prompt);
    textareaRef.current?.focus();
  };

  const handleComposerPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    const files: File[] = [];
    if (items) {
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }
    if (files.length) {
      e.preventDefault();
      void addFiles(files);
      return;
    }

    const text = e.clipboardData?.getData("text/plain") || "";
    if (shouldCollapsePaste(text)) {
      e.preventDefault();
      if (attachments.length >= MAX_ATTACHMENTS) {
        toast.error("Max 6 attachments per message");
        return;
      }
      pasteSerialRef.current += 1;
      const chip = textToPasteAttachment(text, pasteSerialRef.current);
      setAttachments((prev) => [...prev, chip]);
      setExpandedPasteId(null);
      toast.message("Paste attached", {
        description: `${chip.lineCount} lines collapsed into a chip`,
      });
    }
    // short paste → default textarea insert
  };

  return (
    <aside className="h-full bg-[#09090b] flex flex-col overflow-hidden relative border-l border-white/[0.06]">
      <div className="h-10 border-b border-white/[0.06] bg-[#0a0a0b] px-3 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Agent
          </span>
          {onAgentModeChange && (
            <div className="flex rounded-md border border-white/[0.08] p-0.5">
              <button
                type="button"
                onClick={() => onAgentModeChange("talk")}
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                  agentMode === "talk"
                    ? "bg-white/10 text-white/85"
                    : "text-white/30 hover:text-white/50"
                )}
                title="Chat only — no file writes"
              >
                <MessageSquare className="w-2.5 h-2.5" />
                Talk
              </button>
              <button
                type="button"
                onClick={() => onAgentModeChange("plan")}
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                  agentMode === "plan"
                    ? "bg-white/10 text-white/85"
                    : "text-white/30 hover:text-white/50"
                )}
                title="Plan without writing code"
              >
                <ListChecks className="w-2.5 h-2.5" />
                Plan
              </button>
              <button
                type="button"
                onClick={() => onAgentModeChange("build")}
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                  agentMode === "build"
                    ? "bg-white/10 text-white/85"
                    : "text-white/30 hover:text-white/50"
                )}
                title="Autopilot after you approve a clear brief"
              >
                <Hammer className="w-2.5 h-2.5" />
                Build
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {creditsLabel && (
            <span className="text-[9px] font-mono text-white/35 tabular-nums">{creditsLabel}</span>
          )}
          {onToggleAutoFix && (
            <button
              type="button"
              onClick={onToggleAutoFix}
              title="Auto-fix preview/terminal errors"
              className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider border transition-colors",
                autoFixEnabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90"
                  : "border-white/10 text-white/30 hover:text-white/50"
              )}
            >
              <Zap className="w-2.5 h-2.5" />
              Auto-fix {autoFixEnabled ? "on" : "off"}
            </button>
          )}
          {isGenerating ? (
            <span className="text-[10px] text-primary/90 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Running
            </span>
          ) : (
            <span className="text-[10px] text-white/25">Ready</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              {m.role === "assistant" && (
                <span className="text-[9px] uppercase tracking-wider text-white/25 mb-1 px-0.5">
                  {m.meta?.autoFix
                    ? "Auto-fix"
                    : m.meta?.kind === "plan"
                      ? "Plan"
                      : m.meta?.kind === "checkpoint"
                        ? "Checkpoint"
                        : "ShipKernel AI"}
                </span>
              )}
              <div
                className={`max-w-[94%] min-w-0 rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed break-words [overflow-wrap:anywhere] overflow-hidden ${
                  m.role === "user"
                    ? "bg-white text-black rounded-br-md"
                    : m.content.startsWith("Error:") || m.content.startsWith("I hit an error")
                      ? "bg-red-500/10 border border-red-500/20 text-red-200/90"
                      : "bg-white/[0.035] border border-white/[0.06] text-white/75 rounded-bl-md"
                }`}
              >
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2 w-full">
                    {m.attachments.map((a) =>
                      a.kind === "image" && a.dataUrl ? (
                        <img
                          key={a.id}
                          src={a.dataUrl}
                          alt={a.name}
                          className="h-14 w-14 rounded-lg object-cover border border-black/10"
                        />
                      ) : a.kind === "paste" ? (
                        <PasteChip key={a.id} attachment={a} dark={m.role !== "user"} />
                      ) : (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-black/10 w-fit"
                        >
                          <FileText className="w-3 h-3" />
                          {a.name}
                        </span>
                      )
                    )}
                  </div>
                )}
                {m.role === "assistant" ? (
                  <MessageBody content={m.content} stream={Boolean(m.meta?.stream)} />
                ) : m.content.trim() ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : null}

                {m.role === "assistant" && m.meta?.kind === "plan" && m.meta.plan && (
                  <PlanCard
                    plan={m.meta.plan}
                    pendingAnswers={pendingAnswers}
                    disabled={isGenerating || !planInteractive}
                    onAnswer={onAnswerQuestion}
                    onApprove={onApprovePlan}
                  />
                )}

                {m.role === "assistant" && m.meta?.kind === "checkpoint" && m.meta.checkpoint && (
                  <CheckpointCard
                    hasMore={m.meta.checkpoint.hasMore}
                    disabled={isGenerating || !checkpointInteractive}
                    autonomous={agentMode === "build"}
                    onContinue={onContinueWave}
                    onPause={onPauseProcedure}
                  />
                )}
              </div>
            </div>
          ))}

          {(isGenerating || steps.length > 0 || thought || liveLog.length > 0) && (
            <AgentActivityCard
              isGenerating={isGenerating}
              steps={steps}
              thought={thought}
              liveLog={liveLog}
              progress={progress}
              moodLabel={moodLabel}
              moodEmoji={moodEmoji}
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div
        className={cn(
          "p-2.5 border-t border-white/[0.06] bg-[#080808] shrink-0 transition-colors",
          dragOver && "bg-primary/5 border-primary/30"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        {queuedCount > 0 && (
          <div className="mb-1.5 text-[10px] text-white/35 px-0.5">
            {queuedCount} queued — runs after current step
          </div>
        )}

        {briefApprovalVisible && (
          <div className="mb-2">
            <BriefApprovalCard
              ready={briefReady}
              summary={briefSummary}
              disabled={isGenerating}
              onApprove={onApproveBrief}
            />
          </div>
        )}

        {suggestionsOn && (
          <SuggestionRail
            suggestions={suggestions}
            disabled={false}
            onPick={onPickSuggestion}
          />
        )}

        {attachments.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-2 px-0.5">
            {attachments.map((a) =>
              a.kind === "paste" ? (
                <PasteChip
                  key={a.id}
                  attachment={a}
                  dark
                  expanded={expandedPasteId === a.id}
                  onToggle={() =>
                    setExpandedPasteId((id) => (id === a.id ? null : a.id))
                  }
                  onRemove={() => {
                    setAttachments((prev) => prev.filter((x) => x.id !== a.id));
                    if (expandedPasteId === a.id) setExpandedPasteId(null);
                  }}
                />
              ) : (
                <div
                  key={a.id}
                  className="relative group rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden w-fit"
                >
                  {a.kind === "image" && a.dataUrl ? (
                    <img src={a.dataUrl} alt={a.name} className="h-14 w-14 object-cover" />
                  ) : (
                    <div className="h-11 px-2.5 flex items-center gap-1.5 text-[10px] text-white/50 max-w-[160px]">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{a.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )
            )}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl border bg-gradient-to-b from-white/[0.045] to-white/[0.02] transition-all",
            "border-white/[0.1] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_28px_-12px_rgba(0,0,0,0.55)]",
            "focus-within:border-white/25 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_12px_32px_-12px_rgba(0,0,0,0.65)]",
            "p-2"
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={
              agentMode === "talk"
                ? "Ask anything — Talk never writes files…"
                : agentMode === "plan"
                  ? "Ask, refine the plan, or paste a brief…"
                  : isGenerating
                    ? "Queue a follow-up…"
                    : "Message the agent — paste specs collapse into chips…"
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onPaste={handleComposerPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="w-full bg-transparent border-none resize-none px-2.5 pt-2 pb-1.5 text-[13px] text-white/90 placeholder:text-white/28 outline-none min-h-[40px] max-h-[160px] leading-relaxed"
          />
          <div className="flex items-center justify-between px-1 pt-0.5 pb-0.5">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.txt,.md,.json,.tsx,.ts,.jsx,.js,.css,.html,.svg"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-xl text-white/35 hover:text-white hover:bg-white/[0.06]"
                title="Attach image or file"
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
              {onUndo && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={!canUndo || isGenerating}
                  className="h-8 w-8 rounded-xl text-white/35 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
                  title="Undo last generation"
                  onClick={onUndo}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <button
                type="button"
                onClick={() => setSuggestionsOn((v) => !v)}
                className={cn(
                  "h-8 px-2 rounded-xl text-[9px] font-medium transition-colors",
                  suggestionsOn
                    ? "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                    : "text-white/20 hover:text-white/40"
                )}
                title="Toggle chat suggestions"
              >
                Tips {suggestionsOn ? "on" : "off"}
              </button>
            </div>
            {isGenerating && onStop ? (
              <Button
                size="icon"
                onClick={onStop}
                className="h-8 w-8 rounded-xl bg-white/10 text-white hover:bg-white/15"
                title="Stop agent"
              >
                <Square className="w-3 h-3 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={send}
                disabled={!chatInput.trim() && !attachments.length}
                className="h-8 w-8 rounded-xl bg-white text-black hover:bg-white/90 disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
