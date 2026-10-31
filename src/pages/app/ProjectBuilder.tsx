import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateArchitectureStream, generateBuildPlan, generateTalkReply, getByokKey } from "@/services/ai-service";
import { useAuth } from "@/hooks/use-auth";
import { Panel, PanelGroup } from "react-resizable-panels";
import { BuilderToolbar } from "@/components/app/builder/BuilderToolbar";
import { BuilderFileTree } from "@/components/app/builder/BuilderFileTree";
import { BuilderChatPanel, type ChatMessage } from "@/components/app/builder/BuilderChatPanel";
import { BuilderTerminal } from "@/components/app/builder/BuilderTerminal";
import { BuilderSettingsDialog } from "@/components/app/builder/BuilderSettingsDialog";
import { BuilderPreviewPanel } from "@/components/app/builder/BuilderPreviewPanel";
import { ResizeHandle } from "@/components/app/builder/ResizeHandle";
import type { AgentStep } from "@/components/app/builder/AgentActivityCard";
import {
  DEFAULT_VFS,
  buildFileTree,
  applyFileUpdates,
  deriveCodeFromVfs,
  isSeedWorkspace,
} from "@/lib/vfs";
import { readLocalProjects, writeLocalProjects } from "@/hooks/use-projects";
import { displayError, shortError } from "@/lib/errors";
import { formatAgentReply, narrateProgressEvent, composeFollowUpBrief } from "@/lib/generation-prompt";
import {
  buildWorkspaceMemory,
  compactConversation,
  composeFixPrompt,
  diagnoseWorkspace,
  errorSignature,
  limitFixPayload,
  pickFixScale,
  runPreviewPreflight,
  type FixAttempt,
} from "@/lib/agent-intelligence";
import {
  normalizeLoadedChat,
  readChatCache,
  serializeChatMessages,
  writeChatCache,
} from "@/lib/chat-persist";
import {
  buildWaveTargetPaths,
  formatWaveQueueHint,
  hasRemainingStubWork,
  mergeWaveNextPaths,
} from "@/lib/wave-completeness";
import {
  colorNarration,
  moodMeta,
  openerForMood,
  pickMood,
  preWorkPlanLines,
  type AgentMood,
} from "@/lib/agent-voice";
import type { ChatAttachment } from "@/lib/attachments";
import { useBilling } from "@/hooks/use-billing";
import { waveBudget } from "@/lib/complexity";
import {
  resolveProjectPreviewEnvFromSources,
  writeProjectPreviewEnv,
} from "@/lib/project-preview-env";
import {
  emptyProcedure,
  formatPlanChatIntro,
  formatWaveCompleteChat,
  initSessionFromPrompt,
  isChitchat,
  isContinueIntent,
  isPauseIntent,
  isResumeFollowUp,
  localTalkReply,
  assessBriefReadiness,
  briefApprovalHint,
  resolveSeedBriefForBuild,
  isExplicitBuildBypass,
  needsDiscoveryBrief,
  planToApprovedBrief,
  previewAllowsNextWave,
  requiresBriefApproval,
  type AgentChatMode,
  type ProcedureSession,
} from "@/lib/agent-procedure";
import { BuilderSandpackPreview } from "@/components/app/builder/BuilderSandpackPreview";
import {
  isSandpackPreviewEnabled,
  setSandpackPreviewEnabled,
  shouldUseBundlerVerify,
} from "@/lib/preview-v2-flag";

const AUTO_FIX_MAX = 2;

const ProjectBuilder = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { byok, remaining, refresh: refreshBilling } = useBilling();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const sandboxErrorsRef = useRef<string[]>([]);
  const vfsRef = useRef<Record<string, string>>({ ...DEFAULT_VFS });
  const isGeneratingRef = useRef(false);
  const autoFixCountRef = useRef(0);
  const lastAutoFixSigRef = useRef("");
  const lastFixAttemptRef = useRef<FixAttempt | null>(null);
  const resumeBuildAfterFixRef = useRef(false);
  const autoFixTimerRef = useRef<number | null>(null);
  const previewWaitersRef = useRef<Array<(v: "live" | "error" | "timeout") => void>>([]);
  const sendMessageRef = useRef<
    (
      customPrompt?: string,
      opts?: { attachments?: ChatAttachment[]; source?: "user" | "autofix" }
    ) => Promise<void>
  >(async () => {});
  const procedureRef = useRef<ProcedureSession>(emptyProcedure());
  const pendingAnswersRef = useRef<Record<string, string>>({});
  const runWaveRef = useRef<(opts?: { focus?: string }) => Promise<void>>(async () => {});
  const abortGenRef = useRef(false);
  const pauseAutonomyRef = useRef(false);
  const vfsBackupRef = useRef<Record<string, string> | null>(null);
  const editSourceRef = useRef<"agent" | "manual">("agent");
  const manualEditLogTimerRef = useRef<number | null>(null);
  const agentLiveLogRef = useRef<string[]>([]);
  const agentMoodRef = useRef<AgentMood>("focused");
  const messageQueueRef = useRef<
    Array<{ prompt: string; attachments: ChatAttachment[] }>
  >([]);
  /** Attachments for the current user turn — forwarded to Build wave 0 / Talk */
  const pendingAttachmentsRef = useRef<ChatAttachment[]>([]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isValidatingSettings, setIsValidatingSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(
    () => localStorage.getItem("asooju_auto_fix") !== "0"
  );
  const [agentMode, setAgentMode] = useState<AgentChatMode>(() => {
    const raw = localStorage.getItem("asooju_agent_mode");
    if (raw === "plan" || raw === "talk" || raw === "build") return raw;
    // Default Talk — discover before plan/build
    return "talk";
  });
  const [procedure, setProcedure] = useState<ProcedureSession>(() => emptyProcedure());
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [briefGate, setBriefGate] = useState<{ ready: boolean; summary: string }>({
    ready: false,
    summary: "",
  });
  const [sandpackPreview, setSandpackPreview] = useState(() => isSandpackPreviewEnabled());
  const [bundlerVerifyActive, setBundlerVerifyActive] = useState(false);

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview">("preview");
  const [activeMobileTab, setActiveMobileTab] = useState<"editor" | "chat">("editor");

  const [projectName, setProjectName] = useState("My Project");
  const [selectedFile, setSelectedFile] = useState("App.tsx");
  const [vfsFiles, setVfsFiles] = useState<Record<string, string>>({ ...DEFAULT_VFS });
  const dynamicFileTree = buildFileTree(vfsFiles);

  useEffect(() => {
    vfsRef.current = vfsFiles;
  }, [vfsFiles]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    localStorage.setItem("asooju_auto_fix", autoFixEnabled ? "1" : "0");
  }, [autoFixEnabled]);

  useEffect(() => {
    localStorage.setItem("asooju_agent_mode", agentMode);
  }, [agentMode]);

  useEffect(() => {
    procedureRef.current = procedure;
  }, [procedure]);

  useEffect(() => {
    pendingAnswersRef.current = pendingAnswers;
  }, [pendingAnswers]);

  const resolvePreviewWaiters = useCallback((outcome: "live" | "error" | "timeout") => {
    const waiters = previewWaitersRef.current;
    previewWaitersRef.current = [];
    waiters.forEach((w) => w(outcome));
  }, []);

  const waitForPreviewOutcome = useCallback(
    (ms = 5000) =>
      new Promise<"live" | "error" | "timeout">((resolve) => {
        let settled = false;
        const finish = (v: "live" | "error" | "timeout") => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          previewWaitersRef.current = previewWaitersRef.current.filter((w) => w !== finish);
          resolve(v);
        };
        previewWaitersRef.current.push(finish);
        const timer = window.setTimeout(() => finish("timeout"), ms);
      }),
    []
  );

  /** When Bundler is on, wave/auto-fix verify listens to Sandpack (export bundle), not iframe. */
  const acceptBundlerVerifyRef = useRef(false);

  // Files explorer only in code mode (Lovable-style)
  useEffect(() => {
    if (viewMode === "preview") setFilesPanelOpen(false);
    else setFilesPanelOpen(true);
  }, [viewMode]);

  const [chatInput, setChatInput] = useState("");
  const [agentThought, setAgentThought] = useState("");
  const [agentLiveLog, setAgentLiveLog] = useState<string[]>([]);
  const [agentMood, setAgentMood] = useState<AgentMood>("focused");
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [buildingFiles, setBuildingFiles] = useState<string[]>([]);
  const [previewStatus, setPreviewStatus] = useState<"booting" | "live" | "building" | "error">(
    "booting"
  );
  const [previewError, setPreviewError] = useState("");
  const [sandboxErrors, setSandboxErrors] = useState<string[]>([]);
  const [iframeNonce, setIframeNonce] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey — tell me what you want to make. I’ll ask a few questions first, then we Plan or Build when the brief is clear.",
    },
  ]);
  const [terminalLogs, setTerminalLogs] = useState<
    { id: string; time: string; level: "info" | "error" | "success" | "agent"; message: string }[]
  >([
    {
      id: "1",
      time: new Date().toLocaleTimeString(),
      level: "info",
      message: "Workspace ready.",
    },
  ]);
  const terminalLogsRef = useRef(terminalLogs);
  useEffect(() => {
    terminalLogsRef.current = terminalLogs;
  }, [terminalLogs]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  /** Don't auto-save the default welcome over a real transcript before load finishes */
  const chatHydratedRef = useRef(false);
  const chatSaveTimerRef = useRef<number | null>(null);

  const buildAgentContextPack = useCallback(() => {
    const session = procedureRef.current;
    const purpose =
      session.originalPrompt?.trim() ||
      messagesRef.current.find(
        (m) => m.role === "user" && m.content.trim().length > 24 && !m.meta?.autoFix
      )?.content ||
      "";
    const recentChat = messagesRef.current
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
    const { digest, olderHint } = compactConversation(recentChat, { maxMessages: 12 });
    const terminalDigest = [
      ...sandboxErrorsRef.current.slice(-6).map((e) => `[error] ${e}`),
      ...terminalLogsRef.current.slice(-14).map((l) => `[${l.level}] ${l.message}`),
    ]
      .slice(-16)
      .join("\n");
    const workspaceMemory = buildWorkspaceMemory({
      purpose,
      notes: session.notes,
      lastFiles: session.lastFiles,
      nextPaths: session.nextPaths,
    });
    return {
      purpose,
      recentChat: recentChat.slice(-12),
      terminalDigest,
      previewError: previewError || undefined,
      conversationContext: [olderHint, digest].filter(Boolean).join("\n"),
      workspaceMemory,
    };
  }, [previewError]);

  const [activeProvider, setActiveProvider] = useState(
    () => localStorage.getItem("asooju_active_provider") || "openai"
  );
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => ({
    openai: getByokKey("openai"),
    gemini: getByokKey("gemini"),
    grok: getByokKey("grok"),
    claude: getByokKey("claude"),
    deepseek: getByokKey("deepseek"),
  }));
  const setProviderKey = (provider: string, key: string) => {
    setProviderKeys((prev) => ({ ...prev, [provider]: key }));
  };
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");

  const addLog = useCallback(
    (message: string, level: "info" | "error" | "success" | "agent" = "info") => {
      const safe =
        level === "error" ? shortError(message, 240) : message.length > 320 ? `${message.slice(0, 319)}…` : message;
      setTerminalLogs((prev) => [
        ...prev.slice(-49),
        {
          id: Math.random().toString(36).slice(2, 9),
          time: new Date().toLocaleTimeString(),
          level,
          message: safe,
        },
      ]);
    },
    []
  );

  const handleSandpackVerify = useCallback(
    (outcome: "live" | "error", message?: string) => {
      const forVerify = acceptBundlerVerifyRef.current;
      if (!forVerify && !sandpackPreview) return;
      if (outcome === "live") {
        if (forVerify) {
          setPreviewStatus("live");
          setPreviewError("");
          resolvePreviewWaiters("live");
        }
        return;
      }
      const err = shortError(message || "Bundler compile error", 200);
      if (forVerify || sandpackPreview) {
        setPreviewStatus("error");
        setPreviewError(err);
        sandboxErrorsRef.current = [
          ...sandboxErrorsRef.current.slice(-19),
          displayError(message || err, 400),
        ];
        setSandboxErrors([...sandboxErrorsRef.current]);
      }
      if (forVerify) {
        addLog(`PREVIEW (bundler): ${err}`, "error");
        resolvePreviewWaiters("error");
      }
    },
    [sandpackPreview, resolvePreviewWaiters, addLog]
  );

  const runPreviewVerify = useCallback(async (): Promise<"live" | "error" | "timeout"> => {
    const bundlerVerify = shouldUseBundlerVerify(sandpackPreview);
    if (bundlerVerify) {
      if (!sandpackPreview) setBundlerVerifyActive(true);
      acceptBundlerVerifyRef.current = true;
      setPreviewStatus("building");
      await new Promise((r) => window.setTimeout(r, sandpackPreview ? 250 : 450));
      const outcome = await waitForPreviewOutcome(12000);
      let settled = outcome;
      if (outcome === "live") {
        const late = await waitForPreviewOutcome(3000);
        if (late === "error") settled = "error";
      }
      acceptBundlerVerifyRef.current = false;
      if (!sandpackPreview) setBundlerVerifyActive(false);
      return settled;
    }
    window.setTimeout(() => {
      const files = vfsRef.current;
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "EXECUTE_CODE",
          files,
          entryPoint: files["App.tsx"] ? "App.tsx" : Object.keys(files)[0],
          supabaseUrl,
          supabaseKey: supabaseAnonKey,
          soft: false,
        },
        "*"
      );
    }, 60);
    const outcome = await waitForPreviewOutcome(5200);
    let settled = outcome;
    if (outcome === "live") {
      const late = await waitForPreviewOutcome(2600);
      if (late === "error") settled = "error";
    }
    return settled;
  }, [sandpackPreview, waitForPreviewOutcome, supabaseUrl, supabaseAnonKey]);

  const upsertStep = useCallback((step: AgentStep) => {
    setAgentSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === step.id);
      if (idx === -1) {
        const next = prev.map((s) =>
          s.status === "active" && step.status === "active" ? { ...s, status: "done" as const } : s
        );
        return [...next, step];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...step };
      return copy;
    });
  }, []);

  const queueAutoFix = useCallback(
    (err: string) => {
      if (!autoFixEnabled) return;
      if (isGeneratingRef.current) return;
      if (autoFixCountRef.current >= AUTO_FIX_MAX) {
        toast.error("Auto-fix stopped", {
          description: "Still broken after 2 attempts — use Fix with AI or adjust the prompt.",
        });
        return;
      }
      const sig = errorSignature(err);
      const prior = lastFixAttemptRef.current;
      if (
        sig &&
        sig === lastAutoFixSigRef.current &&
        prior &&
        !prior.wroteAny
      ) {
        toast.error("Auto-fix made no changes", {
          description: "Same error returned and no files were patched — adjust the prompt or fix it in the editor.",
        });
        addLog("Auto-fix skipped: identical error after a no-op write", "info");
        return;
      }
      if (autoFixTimerRef.current) window.clearTimeout(autoFixTimerRef.current);
      autoFixTimerRef.current = window.setTimeout(() => {
        if (isGeneratingRef.current) return;
        autoFixCountRef.current += 1;
        lastAutoFixSigRef.current = sig;
        addLog(`Auto-fix attempt ${autoFixCountRef.current}/${AUTO_FIX_MAX}`, "agent");
        void sendMessageRef.current(err, { source: "autofix" });
      }, 700);
    },
    [autoFixEnabled, addLog]
  );

  const thoughtStreamTimerRef = useRef<number | null>(null);
  const waitThoughtTimerRef = useRef<number | null>(null);
  const realThoughtRef = useRef(false);

  const applyMood = useCallback((mood: AgentMood) => {
    agentMoodRef.current = mood;
    setAgentMood(mood);
  }, []);

  const clearWaitThought = useCallback(() => {
    if (waitThoughtTimerRef.current) {
      window.clearInterval(waitThoughtTimerRef.current);
      waitThoughtTimerRef.current = null;
    }
  }, []);

  const streamThought = useCallback(
    (text: string) => {
      if (thoughtStreamTimerRef.current) {
        window.clearInterval(thoughtStreamTimerRef.current);
        thoughtStreamTimerRef.current = null;
      }
      const next = (text || "").trim();
      if (!next) return;
      realThoughtRef.current = true;
      clearWaitThought();
      setAgentThought(next);
    },
    [clearWaitThought]
  );

  const coerceMood = useCallback((raw?: string | null): AgentMood | null => {
    const allowed: AgentMood[] = [
      "focused",
      "curious",
      "proud",
      "wry",
      "teacher",
      "concerned",
      "upbeat",
      "calm",
    ];
    if (!raw) return null;
    const m = raw.toLowerCase().trim() as AgentMood;
    return allowed.includes(m) ? m : null;
  }, []);

  const pushNarration = useCallback((line: string | null | undefined) => {
    const raw = (line || "").trim();
    if (!raw) return;
    const t = colorNarration(raw, agentMoodRef.current);
    setAgentLiveLog((prev) => {
      if (prev[prev.length - 1] === t) return prev;
      const next = [...prev.slice(-40), t];
      agentLiveLogRef.current = next;
      return next;
    });
  }, []);

  const beginGeneratingUi = useCallback(
    (
      steps: AgentStep[],
      opts?: {
        snapshot?: boolean;
        opener?: string;
        mood?: AgentMood;
        preWork?: string[];
      }
    ) => {
      editSourceRef.current = "agent";
      if (opts?.snapshot !== false && !vfsBackupRef.current) {
        vfsBackupRef.current = { ...vfsRef.current };
        setCanUndo(false);
      }
      const mood = opts?.mood || "focused";
      agentMoodRef.current = mood;
      setAgentMood(mood);
      const opener =
        opts?.opener || openerForMood(mood, { wave: 0 });
      const seed = [
        opener,
        ...(opts?.preWork || []),
      ].filter(Boolean);
      realThoughtRef.current = false;
      clearWaitThought();
      if (thoughtStreamTimerRef.current) {
        window.clearInterval(thoughtStreamTimerRef.current);
        thoughtStreamTimerRef.current = null;
      }
      setIsGenerating(true);
      isGeneratingRef.current = true;
      setRightPanelOpen(true);
      setActiveMobileTab("chat");
      setGenProgress(8);
      // Quiet wait-phase thought until the model stream arrives (feels like Cursor TTFT)
      const waitPhases = [
        "Reading the workspace and framing the request…",
        "Checking structure, constraints, and what should change…",
        "Waiting on the model — live thought will stream in as tokens arrive…",
      ];
      setAgentThought(waitPhases[0]);
      let phase = 0;
      waitThoughtTimerRef.current = window.setInterval(() => {
        if (realThoughtRef.current) {
          clearWaitThought();
          return;
        }
        phase = Math.min(phase + 1, waitPhases.length - 1);
        setAgentThought(waitPhases[phase]);
      }, 2200);
      setAgentLiveLog(seed);
      agentLiveLogRef.current = seed;
      setBuildingFiles([]);
      setPreviewError("");
      setPreviewStatus("building");
      setAgentSteps(steps);
    },
    [clearWaitThought]
  );

  const drainMessageQueue = useCallback(() => {
    const next = messageQueueRef.current.shift();
    setQueuedCount(messageQueueRef.current.length);
    if (!next) return;
    window.setTimeout(() => {
      void sendMessageRef.current(next.prompt, {
        attachments: next.attachments,
        source: "user",
      });
    }, 80);
  }, []);

  const persistProject = useCallback(
    async (opts?: {
      silent?: boolean;
      files?: Record<string, string>;
      name?: string;
      messages?: ChatMessage[];
    }): Promise<boolean> => {
      const id = projectId;
      if (!id || id === "new-project" || id === "demo-project") return false;

      const files = opts?.files || vfsRef.current;
      if (!files || Object.keys(files).length === 0) return false;

      const name = opts?.name ?? projectName;
      const code = deriveCodeFromVfs(files);
      const guest = isGuest || !user || user.id === "guest-user-000";
      const chat = serializeChatMessages(opts?.messages || messagesRef.current);
      writeChatCache(id, chat);

      try {
        if (guest) {
          const projects = readLocalProjects();
          const idx = projects.findIndex((p) => p.id === id);
          const record = {
            id,
            name,
            prompt: idx >= 0 ? projects[idx].prompt : "",
            vfs_files: files,
            code,
            chat_messages: chat,
            created_at:
              idx >= 0 ? projects[idx].created_at : new Date().toISOString(),
            user_id: "guest-user-000",
          };
          if (idx >= 0) projects[idx] = { ...projects[idx], ...record };
          else projects.unshift(record);
          writeLocalProjects(projects);
          if (!opts?.silent) toast.success("Saved locally");
          return true;
        }

        const { error } = await supabase
          .from("projects")
          .update({
            vfs_files: files,
            code,
            name,
            chat_messages: chat,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) {
          // Column missing until schema.sql re-run — files still saved without chat
          const missingChat =
            /chat_messages/i.test(error.message || "") ||
            error.code === "PGRST204";
          if (missingChat) {
            const { error: fallbackErr } = await supabase
              .from("projects")
              .update({
                vfs_files: files,
                code,
                name,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id);
            if (fallbackErr) throw fallbackErr;
            addLog(
              "Chat saved in this browser only — re-run supabase/schema.sql to sync chat to cloud.",
              "info"
            );
            if (!opts?.silent) toast.success("Saved (chat local-only until schema update)");
            return true;
          }
          throw error;
        }
        if (!opts?.silent) toast.success("Saved");
        return true;
      } catch (e: any) {
        if (!opts?.silent) {
          toast.error("Save failed", { description: shortError(e, 140) });
        } else {
          addLog(`Auto-save failed: ${shortError(e)}`, "error");
        }
        return false;
      }
    },
    [projectId, projectName, user, isGuest, addLog]
  );

  const handleStop = useCallback(() => {
    abortGenRef.current = true;
    pauseAutonomyRef.current = true;
    addLog("Stop requested — finishing current model call…", "agent");
    toast.message("Stopping after this step");
  }, [addLog]);

  const handleUndo = useCallback(() => {
    if (!vfsBackupRef.current || isGeneratingRef.current) return;
    setVfsFiles({ ...vfsBackupRef.current });
    vfsBackupRef.current = null;
    setCanUndo(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Reverted workspace to the snapshot before the last generation.",
        meta: { kind: "status" },
      },
    ]);
    toast.success("Undid last generation");
  }, []);


  const runBuildWave = useCallback(
    async (opts?: { focus?: string }) => {
      const autonomous = procedureRef.current.mode === "build" || agentMode === "build";
      pauseAutonomyRef.current = false;
      abortGenRef.current = false;
      // Capture turn attachments once; only wave 0 sends them (token economy)
      const turnAttachments = pendingAttachmentsRef.current.slice();
      pendingAttachmentsRef.current = [];

      // Outer autonomous loop — one model call per wave, no re-plan (token economics)
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (abortGenRef.current) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Stopped. Completed work is kept — send a follow-up or undo if needed.",
              meta: { kind: "status" },
            },
          ]);
          setProcedure((p) => ({ ...p, phase: "idle" }));
          procedureRef.current = { ...procedureRef.current, phase: "idle" };
          break;
        }

        const session = procedureRef.current;
        const wave = session.wave;
        const maxWaves = session.maxWaves;
        const scale = session.scale;
        const brief = session.plan
          ? planToApprovedBrief(session.plan, pendingAnswersRef.current)
          : "";
        const focus = opts?.focus?.trim() || "";
        // Clear focus after first wave in a loop so it doesn't repeat
        if (opts?.focus) opts = { ...opts, focus: undefined };

        const waveTargets = buildWaveTargetPaths({
          vfs: vfsRef.current,
          sessionNextPaths: session.nextPaths,
          wave,
          maxWaves,
        });
        const queueHint = formatWaveQueueHint(waveTargets);
        const userPrompt = [
          session.originalPrompt,
          brief ? `\n\nApproved plan:\n${brief}` : "",
          focus ? `\n\nUser focus for this step:\n${focus}` : "",
          queueHint,
          `\n\nExecute ONLY wave ${wave + 1} of ${maxWaves}. Do not finish the entire product in one pass.`,
        ]
          .filter(Boolean)
          .join("");

        setProcedure((p) => ({ ...p, phase: "building" }));
        procedureRef.current = { ...procedureRef.current, phase: "building" };
        const waveMood = pickMood({
          intent: wave === 0 ? "create" : "edit",
          wave,
          maxWaves,
          scale,
          hasError: sandboxErrorsRef.current.length > 0,
        });
        beginGeneratingUi(
          [
            {
              id: "wave",
              label: `Step ${wave + 1}/${maxWaves}`,
              status: "active",
              kind: "status",
            },
            { id: "read", label: "Reading workspace", status: "pending", kind: "tool" },
            { id: "think", label: "Thinking out loud", status: "pending", kind: "think" },
            { id: "write", label: "Writing files", status: "pending", kind: "file" },
            { id: "verify", label: "Verifying preview", status: "pending", kind: "tool" },
          ],
          {
            snapshot: wave === 0,
            mood: waveMood,
            opener: openerForMood(waveMood, {
              wave,
              maxWaves,
              scale,
              intent: wave === 0 ? "create" : "edit",
            }),
            preWork: preWorkPlanLines(waveMood, scale, maxWaves),
          }
        );
        addLog(`Building step ${wave + 1}/${maxWaves}…`, "agent");
        pushNarration(
          wave === 0
            ? "Plan locked — scanning the file tree, then foundation first."
            : `Plan for step ${wave + 1}: prioritize the next highest-value modules.`
        );

        const passErrors = /\b(fix|error|bug|crash|broken|runtime|preview error|module not found)\b/i.test(
          userPrompt
        );
        const errorContext = passErrors
          ? sandboxErrorsRef.current.slice(-5).join("\n") || "None"
          : "None";
        let nextVfs = { ...vfsRef.current };
        let wroteAny = false;
        if (errorContext !== "None") {
          const pre = runPreviewPreflight(nextVfs, errorContext);
          if (pre.changed) {
            nextVfs = pre.vfs;
            vfsRef.current = pre.vfs;
            setVfsFiles(pre.vfs);
            wroteAny = true;
            addLog(`Pre-flight (before model): ${pre.notes.join("; ")}`, "success");
            pushNarration(`Pre-flight cleared issues locally: ${pre.notes[0]}`);
          }
        }
        const wipeSeed = isSeedWorkspace(vfsRef.current) && wave === 0;
        let hasMore = false;
        let nextPaths: string[] = [];
        let filePaths: string[] = [];

        try {
          const response = await generateArchitectureStream(
            userPrompt,
            vfsRef.current,
            errorContext,
            (event) => {
              if (abortGenRef.current) return;
              if (event.type === "status") {
                addLog(event.message, "agent");
                pushNarration(narrateProgressEvent({ type: "status", message: event.message }));
                upsertStep({
                  id: "read",
                  label: event.message.replace(/…$/, "") || "Connecting to model",
                  status: "active",
                  kind: "status",
                });
                setGenProgress((p) => Math.max(p, 15));
              }
              if (event.type === "thought") {
                streamThought(event.text);
                // Don't spam Working for every thought drip — Thought panel owns it
                upsertStep({ id: "read", label: "Workspace loaded", status: "done", kind: "tool" });
                upsertStep({
                  id: "think",
                  label: "Thinking",
                  detail: event.text.slice(0, 80),
                  status: "active",
                  kind: "think",
                });
                setGenProgress((p) => Math.max(p, 35));
              }
              if (event.type === "token") {
                setGenProgress((p) => Math.min(70, p + 0.4));
              }
              if (event.type === "file") {
                if (wipeSeed && !wroteAny) nextVfs = {};
                wroteAny = true;
                nextVfs = applyFileUpdates(nextVfs, [event.file]);
                setVfsFiles({ ...nextVfs });
                setSelectedFile(event.file.path);
                setBuildingFiles((prev) =>
                  prev.includes(event.file.path) ? prev : [...prev, event.file.path]
                );
                pushNarration(
                  narrateProgressEvent({
                    type: "file",
                    path: event.file.path,
                    index: event.index,
                    total: event.total,
                  })
                );
                upsertStep({ id: "think", label: "Approach locked", status: "done", kind: "think" });
                // One write row only — per-file rows made the card thrash
                upsertStep({
                  id: "write",
                  label: `Writing files (${event.index + 1}/${event.total})`,
                  detail: event.file.path,
                  status: event.index + 1 >= event.total ? "done" : "active",
                  kind: "file",
                });
                setGenProgress(70 + ((event.index + 1) / Math.max(event.total, 1)) * 20);
                addLog(`Applied ${event.file.path}`, "success");
              }
            },
            (() => {
              const pack = buildAgentContextPack();
              const dx =
                errorContext !== "None"
                  ? diagnoseWorkspace(vfsRef.current, errorContext)
                  : null;
              const pinned = [
                ...new Set([
                  ...(dx?.errorPaths || []),
                  ...waveTargets,
                  ...session.lastFiles,
                ]),
              ].slice(0, 16);
              return {
                projectName,
                wave,
                scale,
                targetPaths: pinned.length ? pinned : undefined,
                workspacePurpose: session.originalPrompt || pack.purpose,
                conversationContext: pack.conversationContext,
                terminalDigest: pack.terminalDigest,
                workspaceMemory: pack.workspaceMemory,
                diagnosis: dx?.issues.length ? dx.issues.join("\n") : undefined,
                attachments: wave === 0 && turnAttachments.length ? turnAttachments : undefined,
              };
            })()
          );

          if (abortGenRef.current) {
            setVfsFiles({ ...nextVfs });
            setCanUndo(Boolean(vfsBackupRef.current));
            break;
          }

          for (const action of response.actions || []) {
            if (action.type === "delete_file" && action.path) {
              delete nextVfs[action.path];
              upsertStep({
                id: `del:${action.path}`,
                label: `Deleted ${action.path}`,
                status: "done",
                kind: "file",
              });
              addLog(`Deleted ${action.path}`, "info");
            }
          }
          setVfsFiles({ ...nextVfs });
          setGenProgress(92);
          if (wroteAny) {
            const saved = await persistProject({ silent: true, files: nextVfs });
            if (saved) addLog("Auto-saved workspace", "success");
          }
          upsertStep({
            id: "wave",
            label: `Step ${wave + 1} written`,
            status: "done",
            kind: "status",
          });
          upsertStep({ id: "read", label: "Workspace loaded", status: "done", kind: "tool" });
          upsertStep({ id: "think", label: "Plan ready", status: "done", kind: "think" });
          upsertStep({
            id: "write",
            label: wroteAny ? "Files updated" : "No file changes",
            status: "done",
            kind: "file",
          });
          pushNarration("Files are in — verifying the preview sandbox now.");
          upsertStep({
            id: "verify",
            label: "Verifying preview",
            status: "active",
            kind: "tool",
          });

          const structuralPreflight = runPreviewPreflight(
            nextVfs,
            sandboxErrorsRef.current.slice(-5).join("\n")
          );
          if (structuralPreflight.changed) {
            nextVfs = structuralPreflight.vfs;
            vfsRef.current = nextVfs;
            setVfsFiles(nextVfs);
            addLog(`Pre-flight (before verify): ${structuralPreflight.notes.join("; ")}`, "success");
            upsertStep({
              id: "preflight",
              label: "Pre-flight repair",
              detail: structuralPreflight.notes[0],
              status: "done",
              kind: "file",
            });
            await persistProject({ silent: true, files: nextVfs });
          }

          filePaths = (response.files || []).map((f) => f.path);
          nextPaths = mergeWaveNextPaths(response.next_paths, nextVfs, { wave, maxWaves });
          const modelPaths = (response.next_paths || []).map((p) => p.replace(/^\.\//, ""));
          const auditAdded = nextPaths.filter((p) => !modelPaths.includes(p));
          if (auditAdded.length) {
            addLog(
              `Wave queue + audit: ${auditAdded.slice(0, 5).join(", ")}${auditAdded.length > 5 ? "…" : ""}`,
              "info"
            );
          }
          hasMore = wave + 1 < maxWaves;

          // Prefer queued user follow-ups over burning the next wave (matches "after current step")
          const hasQueuedFollowUp = messageQueueRef.current.length > 0;
          const wantsAutoContinue =
            hasMore &&
            autonomous &&
            !pauseAutonomyRef.current &&
            !abortGenRef.current &&
            !hasQueuedFollowUp;
          let willAutoContinue = wantsAutoContinue;

          const responseMood =
            coerceMood(response.mood) ||
            (wave + 1 >= maxWaves ? "proud" : agentMoodRef.current);
          applyMood(responseMood);
          if (response.narration?.trim()) {
            pushNarration(response.narration.trim());
          }

          const talk = formatAgentReply(
            response.thought,
            response.plan || [],
            response.files || [],
            {
              waveLabel: `Step ${wave + 1}/${maxWaves}`,
              liveLog: agentLiveLogRef.current,
              mood: responseMood,
              explanation: response.explanation,
              narration: response.narration,
            }
          );
          const checkpointTail = formatWaveCompleteChat(
            wave,
            maxWaves,
            "",
            filePaths,
            nextPaths
          );
          // Prefer conversational body; keep checkpoint CTA cues at end
          const reply = [
            talk,
            hasMore && !wantsAutoContinue
              ? "\n" + checkpointTail.split("\n").slice(-3).join("\n")
              : "",
          ]
            .filter(Boolean)
            .join("\n");

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: reply,
              meta: {
                kind: "checkpoint",
                files: filePaths,
                stream: true,
                mood: responseMood,
                checkpoint: {
                  wave,
                  maxWaves,
                  files: filePaths,
                  nextPaths,
                  hasMore,
                },
              },
            },
          ]);
          const settled = await runPreviewVerify();

          if (settled === "live") {
            sandboxErrorsRef.current = [];
            setSandboxErrors([]);
            setPreviewStatus("live");
            setPreviewError("");
            upsertStep({
              id: "verify",
              label: "Preview healthy",
              status: "done",
              kind: "tool",
            });
            toast.success(
              filePaths.length
                ? `Step ${wave + 1}: ${filePaths.length} file${filePaths.length === 1 ? "" : "s"}`
                : `Step ${wave + 1} done`
            );
            if (!hasMore && hasRemainingStubWork(vfsRef.current)) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    "Build steps finished, but some screens are still placeholders or imports are missing. Say **continue** and I’ll flesh out the queued paths — or name a screen to prioritize.",
                  meta: { kind: "status" },
                },
              ]);
            }
          } else if (settled === "timeout") {
            upsertStep({
              id: "verify",
              label: "Preview did not confirm",
              status: "done",
              kind: "tool",
            });
            addLog("Preview settle timed out — not marking healthy", "info");
            toast.message(`Step ${wave + 1} written`, {
              description: "Preview didn’t confirm live — check the iframe.",
            });
            willAutoContinue = false;
          } else {
            upsertStep({
              id: "verify",
              label: "Preview still erroring",
              status: "done",
              kind: "tool",
            });
            setPreviewStatus("error");
            const err =
              sandboxErrorsRef.current[sandboxErrorsRef.current.length - 1] ||
              "Unknown preview error";
            toast.message("Preview reported an error", {
              description: shortError(err, 120),
            });
            willAutoContinue = false;
            // Autonomy: auto-fix, then continue waves after fix path
            if (autoFixEnabled && autoFixCountRef.current < AUTO_FIX_MAX) {
              resumeBuildAfterFixRef.current = Boolean(hasMore && autonomous);
              window.setTimeout(() => queueAutoFix(shortError(err, 200)), 120);
              // Don't burn more waves while preview is broken
              const nextSession: ProcedureSession = {
                ...session,
                phase: "awaiting_continue",
                wave: wave + 1,
                nextPaths,
                lastFiles: filePaths,
                maxWaves,
                scale,
                notes: [
                  ...(session.notes || []),
                  `Step ${wave + 1} preview error: ${shortError(err, 100)}`,
                ].slice(-8),
              };
              procedureRef.current = nextSession;
              setProcedure(nextSession);
              setCanUndo(Boolean(vfsBackupRef.current));
              break;
            }
          }

          if (wantsAutoContinue) {
            willAutoContinue = previewAllowsNextWave(settled);
            if (willAutoContinue) {
              pushNarration(`Step ${wave + 1} looks solid — rolling into the next wave.`);
            } else {
              pushNarration(`Step ${wave + 1} written — preview not healthy, pausing before the next wave.`);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    settled === "error"
                      ? "Preview still has an error — I won’t auto-continue. Fix preview, use Auto-fix, or say **continue** when ready."
                      : "Preview didn’t confirm live — pausing before the next step. Check the preview, then say **continue**.",
                  meta: { kind: "status" },
                },
              ]);
            }
          }

          const nextSession: ProcedureSession = {
            ...session,
            phase: willAutoContinue
              ? "building"
              : hasMore
                ? "awaiting_continue"
                : "idle",
            wave: hasMore ? wave + 1 : wave,
            nextPaths,
            lastFiles: filePaths,
            maxWaves,
            scale,
            notes: [
              ...(session.notes || []),
              `Step ${wave + 1}: ${filePaths.slice(0, 8).join(", ") || "no file writes"}`,
            ].slice(-8),
          };
          procedureRef.current = nextSession;
          setProcedure(nextSession);
          setCanUndo(Boolean(vfsBackupRef.current));

          if (!willAutoContinue) break;

          // Brief pause so UI can paint checkpoint, then next wave (same generation session)
          await new Promise((r) => window.setTimeout(r, 400));
          void refreshBilling();
          continue;
        } catch (error: any) {
          const detail = displayError(error, 360);
          addLog(`Generation failed mid-step ${wave + 1}/${maxWaves}: ${shortError(error)}`, "error");
          addLog("Partial files kept. Send ? / continue to resume with this terminal context.", "info");
          toast.error("Generation failed", { description: shortError(error, 140) });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                `Error mid-build (step ${wave + 1}/${maxWaves}): ${detail}\n\n` +
                `Completed files are kept. Reply with "?" or "continue" and I’ll read the terminal + purpose and resume — I won’t restart from scratch.`,
            },
          ]);
          setTerminalOpen(true);
          // Keep originalPrompt / wave / scale so follow-ups can resume
          setProcedure((p) => ({ ...p, phase: "awaiting_continue" }));
          procedureRef.current = { ...procedureRef.current, phase: "awaiting_continue" };
          break;
        }
      }

      setIsGenerating(false);
      isGeneratingRef.current = false;
      setGenProgress(0);
      clearWaitThought();
      void refreshBilling();
      drainMessageQueue();
    },
    [
      addLog,
      upsertStep,
      supabaseUrl,
      supabaseAnonKey,
      projectName,
      runPreviewVerify,
      autoFixEnabled,
      refreshBilling,
      queueAutoFix,
      beginGeneratingUi,
      agentMode,
      drainMessageQueue,
      pushNarration,
      applyMood,
      coerceMood,
      streamThought,
      clearWaitThought,
      persistProject,
      buildAgentContextPack,
    ]
  );

  useEffect(() => {
    runWaveRef.current = runBuildWave;
  }, [runBuildWave]);

  const runPlanPhase = useCallback(
    async (prompt: string, attachments: ChatAttachment[], session: ProcedureSession) => {
      setProcedure({ ...session, phase: "planning" });
      const planMood = pickMood({ intent: "plan", scale: session.scale });
      beginGeneratingUi(
        [
          { id: "read", label: "Reading workspace", status: "active", kind: "tool" },
          { id: "think", label: "Drafting plan", status: "pending", kind: "think" },
        ],
        {
          mood: planMood,
          opener: openerForMood(planMood, { intent: "plan", scale: session.scale }),
          preWork: [
            "🎯 Pre-work: map product shape, wave budget, and decisions worth your call — no code yet.",
          ],
        }
      );
      addLog("Plan mode: drafting approach…", "agent");
      pushNarration("Gathering product shape, waves, and clarifying questions for you.");
      setPendingAnswers({});

      try {
        const plan = await generateBuildPlan(
          prompt,
          vfsRef.current,
          (event) => {
            if (event.type === "status") {
              addLog(event.message, "agent");
              pushNarration(narrateProgressEvent({ type: "status", message: event.message }));
              upsertStep({
                id: "read",
                label: event.message.replace(/…$/, "") || "Connecting",
                status: "active",
                kind: "status",
              });
              setGenProgress((p) => Math.max(p, 20));
            }
            if (event.type === "thought") {
              streamThought(event.text);
              pushNarration("Drafting the plan narrative for your review…");
              upsertStep({ id: "read", label: "Context ready", status: "done", kind: "tool" });
              upsertStep({
                id: "think",
                label: "Drafting plan",
                detail: event.text.slice(0, 100),
                status: "active",
                kind: "think",
              });
              setGenProgress((p) => Math.max(p, 55));
            }
          },
          { projectName, attachments, scale: session.scale, workspacePurpose: session.originalPrompt }
        );

        const maxWaves = Math.max(
          plan.waves.length || 1,
          waveBudget(plan.scale).maxWaves
        );
        upsertStep({ id: "think", label: "Plan ready for review", status: "done", kind: "think" });
        setGenProgress(100);

        const ready: ProcedureSession = {
          ...session,
          phase: "awaiting_plan",
          plan,
          scale: plan.scale,
          maxWaves: Math.min(maxWaves, waveBudget(plan.scale).maxWaves),
          wave: 0,
          nextPaths: [],
        };
        procedureRef.current = ready;
        setProcedure(ready);

        const planReplyMood = coerceMood(plan.mood) || planMood;
        applyMood(planReplyMood);

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: formatPlanChatIntro(plan),
            meta: { kind: "plan", plan, stream: true, mood: planReplyMood },
          },
        ]);
        pushNarration("Plan is on the table — approve to build, or refine in chat.");
        toast.message("Plan ready", { description: "Approve to start building, or refine in chat." });
      } catch (error: any) {
        const detail = displayError(error, 360);
        addLog(`Plan failed: ${shortError(error)}`, "error");
        toast.error("Plan failed", { description: shortError(error, 140) });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${detail}` },
        ]);
        procedureRef.current = { ...procedureRef.current, phase: "idle" };
        setProcedure((p) => ({ ...p, phase: "idle" }));
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
        setGenProgress(0);
        clearWaitThought();
        void refreshBilling();
        drainMessageQueue();
      }
    },
    [addLog, upsertStep, projectName, beginGeneratingUi, refreshBilling, pushNarration, applyMood, coerceMood, streamThought, clearWaitThought, drainMessageQueue]
  );

  const handleApprovePlan = useCallback(() => {
    const session = procedureRef.current;
    if (session.phase !== "awaiting_plan" || isGeneratingRef.current) return;
    const approvedBrief = session.plan
      ? planToApprovedBrief(session.plan, pendingAnswersRef.current)
      : session.originalPrompt;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Approved — start building." },
      {
        role: "assistant",
        content: "Locked the plan. Building step 1 now — I’ll pause after it so you can steer.",
        meta: { kind: "status" },
      },
    ]);
    setAgentMode("build");
    pauseAutonomyRef.current = false;
    abortGenRef.current = false;
    const next = {
      ...session,
      mode: "build" as const,
      phase: "building" as const,
      wave: 0,
      briefApproved: true,
      approvedBrief,
      originalPrompt: approvedBrief || session.originalPrompt,
    };
    procedureRef.current = next;
    setProcedure(next);
    setBriefGate({ ready: false, summary: "" });
    void runWaveRef.current();
  }, []);

  const beginBuildFromBrief = useCallback(
    (brief: string, opts?: { announceInChat?: boolean }) => {
      if (isGeneratingRef.current || !brief.trim()) return;
      const vfs = vfsRef.current;
      if (opts?.announceInChat !== false) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Brief locked. Building step 1 — preview must be healthy before I auto-continue to later steps.",
            meta: { kind: "status" },
          },
        ]);
      }
      setAgentMode("build");
      pauseAutonomyRef.current = false;
      abortGenRef.current = false;
      vfsBackupRef.current = null;

      const session = initSessionFromPrompt(brief, vfs, "build", "user");
      const building: ProcedureSession = {
        ...session,
        mode: "build",
        phase: "building",
        wave: 0,
        briefApproved: true,
        approvedBrief: brief,
        originalPrompt: brief,
        notes: procedureRef.current.notes || [],
      };
      procedureRef.current = building;
      setProcedure(building);
      setBriefGate({ ready: false, summary: "" });
      void runWaveRef.current();
    },
    []
  );

  const handleApproveBrief = useCallback(() => {
    if (isGeneratingRef.current) return;
    const vfs = vfsRef.current;
    if (!requiresBriefApproval(vfs, procedureRef.current.briefApproved)) return;

    const purpose = procedureRef.current.originalPrompt?.trim() || briefGate.summary;
    const readiness = assessBriefReadiness("", vfs, purpose);
    if (!readiness.ready && !readiness.summary.trim()) {
      toast.message("Brief still thin", {
        description: "Add product type, audience, and must-have screen in chat first.",
      });
      return;
    }
    const brief = purpose || readiness.summary.trim();
    if (!brief) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Approve brief & build." },
    ]);
    beginBuildFromBrief(brief, { announceInChat: true });
  }, [briefGate.summary, beginBuildFromBrief]);

  const handleContinueWave = useCallback(() => {
    const session = procedureRef.current;
    if (session.phase !== "awaiting_continue" || isGeneratingRef.current) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Continue to the next step." },
    ]);
    void runWaveRef.current();
  }, []);

  const handlePauseProcedure = useCallback(() => {
    pauseAutonomyRef.current = true;
    abortGenRef.current = false;
    setProcedure((p) => ({ ...p, phase: "idle" }));
    procedureRef.current = { ...procedureRef.current, phase: "idle" };
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Paused. Preview what’s there, or tell me what to change — we can resume anytime.",
        meta: { kind: "status" },
      },
    ]);
  }, []);

  const handleAnswerQuestion = useCallback((questionId: string, answer: string) => {
    setPendingAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSendMessage = useCallback(
    async (
      customPrompt?: string,
      opts?: { attachments?: ChatAttachment[]; source?: "user" | "autofix" }
    ) => {
      const source = opts?.source || "user";
      const attachments = opts?.attachments || [];
      const userPrompt =
        customPrompt ||
        chatInput ||
        (attachments.length
          ? "Use the attached image/file as the design or spec reference and implement it."
          : "");
      if (!userPrompt.trim() && !attachments.length) return;

      // Stash attachments for Build / Talk (chips alone are not enough for the model)
      if (source === "user") {
        pendingAttachmentsRef.current = attachments;
      }

      // Queue follow-ups while autonomous build runs (Lovable pattern)
      if (isGeneratingRef.current && source === "user") {
        messageQueueRef.current.push({ prompt: userPrompt, attachments });
        setQueuedCount(messageQueueRef.current.length);
        setChatInput("");
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: userPrompt,
            attachments: attachments.length ? attachments : undefined,
          },
          {
            role: "assistant",
            content: `Queued (${messageQueueRef.current.length}) — I’ll pick this up after the current step.`,
            meta: { kind: "status" },
          },
        ]);
        return;
      }
      if (isGeneratingRef.current && source === "autofix") return;

      if (source === "user") {
        autoFixCountRef.current = 0;
        lastAutoFixSigRef.current = "";
        lastFixAttemptRef.current = null;
        resumeBuildAfterFixRef.current = false;
      }

      const displayPrompt =
        source === "autofix" ? `Auto-fixing preview error…` : userPrompt;

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: displayPrompt,
          attachments: attachments.length ? attachments : undefined,
          meta: source === "autofix" ? { autoFix: true } : undefined,
        },
      ]);
      if (source === "user") setChatInput("");

      const phase = procedureRef.current.phase;
      const packEarly = buildAgentContextPack();
      const purposeEarly = packEarly.purpose || procedureRef.current.originalPrompt;
      const briefApproved = procedureRef.current.briefApproved;
      if (source === "user" && agentMode === "build" && isChitchat(userPrompt)) {
        const local = localTalkReply(userPrompt, { purpose: purposeEarly, mode: agentMode });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              local ||
              "Hey — say what to build (product, audience, must-have screen) and Build mode will start when it’s clear enough.",
          },
        ]);
        drainMessageQueue();
        return;
      }

      const discovery =
        source === "user" &&
        phase !== "awaiting_plan" &&
        phase !== "awaiting_continue" &&
        (agentMode === "talk" ||
          (agentMode !== "build" &&
            (isChitchat(userPrompt) ||
              needsDiscoveryBrief(userPrompt, vfsRef.current, purposeEarly, briefApproved))));

      const clearActivityChrome = () => {
        setAgentSteps([]);
        setAgentLiveLog([]);
        agentLiveLogRef.current = [];
        setAgentThought("");
        setGenProgress(0);
        setBuildingFiles([]);
        setPreviewStatus((s) => (s === "building" ? "live" : s));
      };

      // Talk / chitchat / vague brief — discover first, never dump a build plan
      if (discovery) {
        if (isChitchat(userPrompt)) {
          const local = localTalkReply(userPrompt, {
            purpose: purposeEarly,
            mode: agentMode,
          });
          clearActivityChrome();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                local ||
                "Hey! Tell me what you want to make — I’ll clarify before any plan or code.",
            },
          ]);
          drainMessageQueue();
          return;
        }

        const talkMood = pickMood({ intent: "plan", hasError: Boolean(packEarly.previewError) });
        beginGeneratingUi(
          [
            { id: "read", label: "Reading context", status: "active", kind: "tool" },
            { id: "think", label: "Figuring out the brief", status: "pending", kind: "think" },
          ],
          {
            snapshot: false,
            mood: talkMood,
            opener: "Discovery first — no plan or file writes until the brief is clear.",
            preWork: ["💬 Clarifying what to build — not planning waves yet."],
          }
        );
        try {
          const reply = await generateTalkReply(
            userPrompt,
            vfsRef.current,
            (event) => {
              if (event.type === "status") {
                addLog(event.message, "agent");
                upsertStep({
                  id: "read",
                  label: event.message.replace(/…$/, "") || "Reading context",
                  status: "active",
                  kind: "status",
                });
              }
              if (event.type === "thought") {
                streamThought(event.text);
                upsertStep({ id: "read", label: "Context loaded", status: "done", kind: "tool" });
                upsertStep({
                  id: "think",
                  label: "Figuring out the brief",
                  status: "active",
                  kind: "think",
                });
              }
            },
            {
              projectName,
              workspacePurpose: purposeEarly,
              conversationContext: packEarly.conversationContext,
              terminalDigest: packEarly.terminalDigest,
              workspaceMemory: packEarly.workspaceMemory,
              discovery: true,
              attachments: attachments.length ? attachments : undefined,
            }
          );
          const mood = coerceMood(reply.mood) || talkMood;
          applyMood(mood);
          clearActivityChrome();
          pendingAttachmentsRef.current = [];
          const mergedPurpose = purposeEarly
            ? `${purposeEarly}\n\n${userPrompt.trim()}`
            : userPrompt.trim();
          procedureRef.current = {
            ...procedureRef.current,
            originalPrompt: mergedPurpose,
          };
          const readiness = assessBriefReadiness(
            userPrompt,
            vfsRef.current,
            mergedPurpose
          );
          setBriefGate(readiness);
          const hint = requiresBriefApproval(vfsRef.current, briefApproved)
            ? readiness.ready
              ? `\n\n${briefApprovalHint(agentMode)}\n\n**Approve brief & build** when this matches what you want.`
              : `\n\n${briefApprovalHint(agentMode)}`
            : "";
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: reply.reply + hint,
              meta: { kind: "status", mood, stream: true },
            },
          ]);
        } catch (error: any) {
          clearActivityChrome();
          addLog(`Talk failed: ${shortError(error)}`, "error");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                `Couldn't reply: ${displayError(error, 280)}\n\n` +
                `Tell me the product type, who it’s for, and the must-have screen — then we can Plan/Build.`,
            },
          ]);
        } finally {
          setIsGenerating(false);
          isGeneratingRef.current = false;
          setGenProgress(0);
          clearWaitThought();
          void refreshBilling();
          drainMessageQueue();
        }
        return;
      }

      // --- Interactive gates (Lovable-style) ---
      if (source === "user" && phase === "awaiting_plan") {
        if (isContinueIntent(userPrompt) || /approve|build it|start building/i.test(userPrompt)) {
          setAgentMode("build");
          const next = {
            ...procedureRef.current,
            mode: "build" as const,
            phase: "building" as const,
            wave: 0,
          };
          procedureRef.current = next;
          setProcedure(next);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Approved. Building step 1 — I’ll check in when it’s ready.",
              meta: { kind: "status" },
            },
          ]);
          void runWaveRef.current();
          return;
        }
        // Revise plan with new constraints
        const revised = `${procedureRef.current.originalPrompt}\n\nPlan revision notes:\n${userPrompt}`;
        const session = initSessionFromPrompt(revised, vfsRef.current, "plan", "user");
        session.originalPrompt = procedureRef.current.originalPrompt;
        procedureRef.current = session;
        await runPlanPhase(revised, attachments, session);
        return;
      }

      if (source === "user" && phase === "awaiting_continue") {
        if (isPauseIntent(userPrompt)) {
          handlePauseProcedure();
          return;
        }
        if (isContinueIntent(userPrompt)) {
          void runWaveRef.current();
          return;
        }
        // Treat as focus for next wave
        void runWaveRef.current({ focus: userPrompt });
        return;
      }

      // Autofix: local repairs first, then one surgical model call (never simple-scale)
      if (source === "autofix") {
        const fixMood =
          autoFixCountRef.current > 1
            ? ("wry" as AgentMood)
            : pickMood({ intent: "fix", autoFix: true, hasError: true });
        beginGeneratingUi(
          [
            { id: "read", label: "Reading workspace", status: "active", kind: "tool" },
            { id: "think", label: "Diagnosing", status: "pending", kind: "think" },
            { id: "write", label: "Applying fix", status: "pending", kind: "file" },
            { id: "verify", label: "Verifying preview", status: "pending", kind: "tool" },
          ],
          {
            mood: fixMood,
            opener: openerForMood(fixMood, { intent: "fix", autoFix: true, hasError: true }),
            preWork: [
              "🛠️ Pre-work: run local pre-flight (routers, exports, missing stubs) before any model call.",
            ],
          }
        );
        addLog(`Auto-fix: ${userPrompt.slice(0, 80)}…`, "agent");
        pushNarration("Reading the error stack and the offending modules…");
        const errorContext =
          sandboxErrorsRef.current.slice(-5).join("\n") || userPrompt || "None";
        const snapshot = { ...vfsRef.current };
        const preflight = runPreviewPreflight(snapshot, errorContext);
        const dx = preflight.diagnosis;
        let nextVfs = preflight.vfs;
        let wroteAny = preflight.changed;

        const verifyPreview = () => runPreviewVerify();

        const resumeBuildIfNeeded = () => {
          if (!resumeBuildAfterFixRef.current) return;
          if (messageQueueRef.current.length) {
            resumeBuildAfterFixRef.current = false;
            return;
          }
          const s = procedureRef.current;
          if (s.wave < s.maxWaves) {
            resumeBuildAfterFixRef.current = false;
            addLog("Preview healthy — continuing remaining build steps", "agent");
            window.setTimeout(() => void runWaveRef.current(), 280);
          } else {
            resumeBuildAfterFixRef.current = false;
          }
        };

        try {
          if (preflight.changed) {
            setVfsFiles({ ...nextVfs });
            upsertStep({
              id: "think",
              label: "Local diagnosis",
              detail: preflight.notes[0],
              status: "done",
              kind: "think",
            });
            upsertStep({
              id: "write",
              label: "Applied pre-flight repair",
              detail: preflight.notes.join("; "),
              status: "done",
              kind: "file",
            });
            addLog(preflight.notes.join("; "), "success");
            pushNarration(`Fixed without a model call: ${preflight.notes[0]}`);
            await persistProject({ silent: true, files: nextVfs });
            upsertStep({ id: "verify", label: "Verifying preview", status: "active", kind: "tool" });
            const localSettled = await verifyPreview();
            if (localSettled === "live") {
              sandboxErrorsRef.current = [];
              setSandboxErrors([]);
              setPreviewStatus("live");
              setPreviewError("");
              upsertStep({ id: "verify", label: "Preview healthy", status: "done", kind: "tool" });
              autoFixCountRef.current = 0;
              lastFixAttemptRef.current = null;
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `🛠️ ${preflight.notes.join(" ")} — no model call, so no tokens burned. Preview should be healthy now.`,
                  meta: { autoFix: true, files: Object.keys(nextVfs).filter((p) => nextVfs[p] !== snapshot[p]) },
                },
              ]);
              resumeBuildIfNeeded();
              return;
            }
            addLog("Pre-flight repair didn’t clear the preview — asking the model", "info");
          }

          const fixPrompt = composeFixPrompt({
            error: errorContext,
            attempt: autoFixCountRef.current,
            maxAttempts: AUTO_FIX_MAX,
            diagnosis: dx,
            prior: lastFixAttemptRef.current,
          });
          const pack = buildAgentContextPack();
          const fixScale = pickFixScale(
            procedureRef.current.scale,
            Object.keys(vfsRef.current).length
          );
          const prior = lastFixAttemptRef.current;

          const response = await generateArchitectureStream(
            fixPrompt,
            vfsRef.current,
            errorContext,
            (event) => {
              if (event.type === "status") {
                addLog(event.message, "agent");
                pushNarration(narrateProgressEvent({ type: "status", message: event.message }));
                upsertStep({
                  id: "read",
                  label: event.message.replace(/…$/, "") || "Connecting",
                  status: "active",
                  kind: "status",
                });
              }
              if (event.type === "thought") {
                streamThought(event.text);
                pushNarration("Diagnosis streaming into Thinking — keeping the fix surgical.");
                upsertStep({ id: "read", label: "Workspace loaded", status: "done", kind: "tool" });
                upsertStep({
                  id: "think",
                  label: "Diagnosing",
                  status: "active",
                  kind: "think",
                });
              }
              if (event.type === "file") {
                wroteAny = true;
                nextVfs = applyFileUpdates(nextVfs, [event.file]);
                setVfsFiles({ ...nextVfs });
                setSelectedFile(event.file.path);
                pushNarration(
                  narrateProgressEvent({
                    type: "file",
                    path: event.file.path,
                    index: event.index,
                    total: event.total,
                  })
                );
                upsertStep({
                  id: "write",
                  label: `Applying fix (${event.index + 1}/${event.total})`,
                  detail: event.file.path,
                  status: event.index + 1 >= event.total ? "done" : "active",
                  kind: "file",
                });
              }
            },
            {
              projectName,
              attachments,
              scale: fixScale,
              wave: 0,
              targetPaths: [...new Set([...dx.errorPaths, ...procedureRef.current.lastFiles])].slice(
                0,
                16
              ),
              workspacePurpose: pack.purpose || procedureRef.current.originalPrompt,
              conversationContext: pack.conversationContext,
              terminalDigest: pack.terminalDigest,
              workspaceMemory: pack.workspaceMemory,
              diagnosis: dx.issues.join("\n"),
              fixAttempt: autoFixCountRef.current,
              priorFixNote: prior
                ? `Touched ${prior.files.join(", ") || "(none)"}; wroteAny=${prior.wroteAny}; ${prior.thought.slice(0, 300)}`
                : undefined,
            }
          );

          const limited = limitFixPayload(
            response.files || [],
            snapshot,
            dx.errorPaths,
            8
          );
          if (limited.dropped.length) {
            for (const p of limited.dropped) {
              if (snapshot[p] != null) nextVfs[p] = snapshot[p];
              else delete nextVfs[p];
            }
            addLog(
              `Kept autofix surgical — dropped unrelated rewrites: ${limited.dropped.slice(0, 6).join(", ")}`,
              "info"
            );
          }
          for (const action of response.actions || []) {
            if (action.type === "delete_file" && action.path) delete nextVfs[action.path];
          }
          wroteAny = limited.files.length > 0 || preflight.changed;
          lastFixAttemptRef.current = {
            error: errorContext,
            files: limited.files.map((f) => f.path),
            thought: response.thought || "",
            wroteAny,
          };
          setVfsFiles({ ...nextVfs });
          upsertStep({
            id: "write",
            label: wroteAny ? "Fix applied" : "No changes",
            status: "done",
            kind: "file",
          });
          upsertStep({ id: "verify", label: "Verifying preview", status: "active", kind: "tool" });
          if (wroteAny) {
            const saved = await persistProject({ silent: true, files: nextVfs });
            if (saved) addLog("Auto-saved fix", "success");
          }
          const responseMood = coerceMood(response.mood) || fixMood;
          applyMood(responseMood);
          if (response.narration?.trim()) pushNarration(response.narration.trim());
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: formatAgentReply(response.thought, response.plan || [], limited.files, {
                autoFix: true,
                liveLog: agentLiveLogRef.current,
                mood: responseMood,
                explanation: response.explanation,
                narration: response.narration,
              }),
              meta: {
                autoFix: true,
                files: limited.files.map((f) => f.path),
                stream: true,
                mood: responseMood,
              },
            },
          ]);
          pushNarration("Fix applied — verifying preview.");
          const settled = await verifyPreview();
          if (settled === "live") {
            sandboxErrorsRef.current = [];
            setSandboxErrors([]);
            setPreviewStatus("live");
            setPreviewError("");
            upsertStep({ id: "verify", label: "Preview healthy", status: "done", kind: "tool" });
            autoFixCountRef.current = 0;
            lastFixAttemptRef.current = null;
            procedureRef.current = {
              ...procedureRef.current,
              notes: [
                ...(procedureRef.current.notes || []),
                `Fix ok: ${limited.files.map((f) => f.path).slice(0, 6).join(", ") || "local"}`,
              ].slice(-8),
            };
            setProcedure(procedureRef.current);
            resumeBuildIfNeeded();
          } else if (settled === "timeout") {
            upsertStep({
              id: "verify",
              label: "Preview did not confirm",
              status: "done",
              kind: "tool",
            });
            addLog("Auto-fix: preview settle timed out", "info");
          } else {
            upsertStep({ id: "verify", label: "Still erroring", status: "done", kind: "tool" });
            setPreviewStatus("error");
            const err =
              sandboxErrorsRef.current[sandboxErrorsRef.current.length - 1] ||
              "Unknown preview error";
            procedureRef.current = {
              ...procedureRef.current,
              notes: [
                ...(procedureRef.current.notes || []),
                `Fix attempt ${autoFixCountRef.current} still failing: ${shortError(err, 80)}`,
              ].slice(-8),
            };
            setProcedure(procedureRef.current);
            if (autoFixEnabled && autoFixCountRef.current < AUTO_FIX_MAX) {
              window.setTimeout(() => queueAutoFix(shortError(err, 200)), 120);
            }
          }
        } catch (error: any) {
          addLog(`Auto-fix failed: ${shortError(error)}`, "error");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${displayError(error, 360)}` },
          ]);
        } finally {
          setIsGenerating(false);
          isGeneratingRef.current = false;
          setGenProgress(0);
          clearWaitThought();
          void refreshBilling();
          drainMessageQueue();
        }
        return;
      }

      // New request — keep purpose on explicit resume follow-ups ("?", "continue") so we don't restart lost
      const pack = buildAgentContextPack();
      const existingPurpose = procedureRef.current.originalPrompt?.trim() || pack.purpose;
      const hasWorkspaceMemory =
        existingPurpose.length > 12 ||
        pack.terminalDigest.length > 20 ||
        !isSeedWorkspace(vfsRef.current);
      // Only explicit resume cues — never "hi" / short chitchat / random short asks
      const resume =
        source === "user" &&
        agentMode === "build" &&
        isResumeFollowUp(userPrompt) &&
        hasWorkspaceMemory;

      if (resume) {
        const purpose =
          existingPurpose ||
          "Continue the in-progress workspace — do not invent a new product.";
        const focus = composeFollowUpBrief({
          userMessage: userPrompt,
          purpose,
          recentChat: pack.recentChat,
          terminalDigest: pack.terminalDigest,
          previewError: pack.previewError,
        });
        pauseAutonomyRef.current = false;
        abortGenRef.current = false;
        const maxWaves = Math.max(procedureRef.current.maxWaves || 1, 1);
        const wave = Math.min(procedureRef.current.wave || 0, Math.max(maxWaves - 1, 0));
        const resumed: ProcedureSession = {
          ...procedureRef.current,
          originalPrompt: purpose,
          mode: "build",
          phase: "building",
          maxWaves,
          wave,
        };
        procedureRef.current = resumed;
        setProcedure(resumed);
        addLog("Resuming with purpose + terminal context…", "agent");
        pushNarration("Got your follow-up — checking terminal + prior purpose before I touch files.");
        await runWaveRef.current({ focus });
        return;
      }

      // Plan mode with a real ask → plan (not build). Build mode → build.
      if (agentMode === "plan") {
        const session = initSessionFromPrompt(userPrompt, vfsRef.current, "plan", source);
        if (existingPurpose && source === "user" && userPrompt.trim().length < 120) {
          session.originalPrompt = `${existingPurpose}\n\nFollow-up:\n${userPrompt.trim()}`;
        }
        session.notes = procedureRef.current.notes || [];
        procedureRef.current = session;
        setProcedure(session);
        await runPlanPhase(
          composeFollowUpBrief({
            userMessage: userPrompt,
            purpose: session.originalPrompt,
            recentChat: pack.recentChat,
            terminalDigest: pack.terminalDigest,
            previewError: pack.previewError,
          }),
          attachments,
          session
        );
        return;
      }

      if (
        source === "user" &&
        requiresBriefApproval(vfsRef.current, procedureRef.current.briefApproved)
      ) {
        const resolution = resolveSeedBriefForBuild(
          userPrompt,
          vfsRef.current,
          existingPurpose,
          procedureRef.current.briefApproved
        );
        procedureRef.current = {
          ...procedureRef.current,
          originalPrompt: resolution.merged,
        };
        setProcedure(procedureRef.current);

        if (agentMode === "build" && resolution.action === "build") {
          setBriefGate({ ready: false, summary: "" });
          beginBuildFromBrief(resolution.merged, { announceInChat: true });
          drainMessageQueue();
          return;
        }

        setBriefGate(resolution.readiness);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              agentMode === "build"
                ? resolution.readiness.ready
                  ? `${briefApprovalHint(agentMode)}\n\nStarting build now.`
                  : `${briefApprovalHint(agentMode)}\n\nAdd **product type**, **audience**, and **must-have flow** in your next message — I’ll start automatically when that’s clear.`
                : resolution.readiness.ready
                  ? `${briefApprovalHint(agentMode)}\n\nWhen you're happy with the brief, click **Approve brief & build**.`
                  : `${briefApprovalHint(agentMode)}\n\nTell me product type, audience, and the must-have flow — then approve.`,
            meta: { kind: "status" },
          },
        ]);
        drainMessageQueue();
        return;
      }

      const session = initSessionFromPrompt(userPrompt, vfsRef.current, agentMode, source);
      session.mode = agentMode;
      session.notes = procedureRef.current.notes || [];
      if (existingPurpose && source === "user" && userPrompt.trim().length < 120) {
        session.originalPrompt = `${existingPurpose}\n\nFollow-up:\n${userPrompt.trim()}`;
      }
      if (
        source === "user" &&
        isExplicitBuildBypass(userPrompt) &&
        requiresBriefApproval(vfsRef.current, false)
      ) {
        const mergedBrief = existingPurpose
          ? `${existingPurpose}\n\n${userPrompt.trim()}`
          : userPrompt.trim();
        session.briefApproved = true;
        session.approvedBrief = mergedBrief;
        session.originalPrompt = mergedBrief;
      }
      procedureRef.current = session;
      setProcedure(session);
      vfsBackupRef.current = null;
      pauseAutonomyRef.current = false;
      abortGenRef.current = false;

      if (session.phase === "planning") {
        await runPlanPhase(
          composeFollowUpBrief({
            userMessage: userPrompt,
            purpose: session.originalPrompt,
            recentChat: pack.recentChat,
            terminalDigest: pack.terminalDigest,
            previewError: pack.previewError,
          }),
          attachments,
          session
        );
        return;
      }

      // Direct autonomous build
      const building = { ...session, phase: "building" as const, wave: 0, mode: agentMode };
      procedureRef.current = building;
      setProcedure(building);
      // First wave: pass packed context as focus so the model sees chat + terminal even on turn 1 follow-ons
      if (pack.terminalDigest || pack.recentChat.length > 1) {
        await runBuildWave({
          focus: composeFollowUpBrief({
            userMessage: userPrompt,
            purpose: session.originalPrompt,
            recentChat: pack.recentChat,
            terminalDigest: pack.terminalDigest,
            previewError: pack.previewError,
          }),
        });
      } else {
        await runBuildWave();
      }
    },
    [
      chatInput,
      addLog,
      upsertStep,
      supabaseUrl,
      supabaseAnonKey,
      projectName,
      runPreviewVerify,
      autoFixEnabled,
      refreshBilling,
      queueAutoFix,
      beginGeneratingUi,
      runPlanPhase,
      runBuildWave,
      agentMode,
      handlePauseProcedure,
      pushNarration,
      applyMood,
      coerceMood,
      streamThought,
      clearWaitThought,
      persistProject,
      buildAgentContextPack,
      drainMessageQueue,
    ]
  );

  useEffect(() => {
    sendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

  const lastRuntimeErrRef = useRef<{ msg: string; at: number }>({ msg: "", at: 0 });

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "PREVIEW_READY") {
        setIsPreviewReady(true);
        const files = vfsRef.current;
        iframeRef.current?.contentWindow?.postMessage(
          {
            type: "EXECUTE_CODE",
            files,
            entryPoint: files["App.tsx"] ? "App.tsx" : Object.keys(files)[0],
            supabaseUrl,
            supabaseKey: supabaseAnonKey,
            soft: false,
          },
          "*"
        );
      }
      if (e.data?.type === "PREVIEW_STATUS") {
        const status = e.data.status as "live" | "building" | "error" | undefined;
        if (status === "live") {
          setPreviewStatus("live");
          setPreviewError("");
          resolvePreviewWaiters("live");
        } else if (status === "building") {
          setPreviewStatus((s) => (s === "error" ? s : "building"));
        } else if (status === "error" && e.data.message) {
          const err = shortError(e.data.message, 200);
          // Skip duplicate of a RUNTIME_ERROR just handled
          const now = Date.now();
          if (
            lastRuntimeErrRef.current.msg === err &&
            now - lastRuntimeErrRef.current.at < 800
          ) {
            resolvePreviewWaiters("error");
            return;
          }
          setPreviewStatus("error");
          setPreviewError(err);
          // Always surface preview failures in the terminal (incl. after manual edits)
          sandboxErrorsRef.current = [
            ...sandboxErrorsRef.current.slice(-19),
            displayError(e.data.message, 400),
          ];
          setSandboxErrors([...sandboxErrorsRef.current]);
          addLog(`PREVIEW: ${err}`, "error");
          setTerminalOpen(true);
          resolvePreviewWaiters("error");
          if (!isGeneratingRef.current && editSourceRef.current === "manual") {
            toast.error("Preview error", {
              description: err,
              action: {
                label: "Fix with AI",
                onClick: () =>
                  handleSendMessage(
                    `Fix this runtime error in the workspace: "${err}". Prefer MemoryRouter or a single top-level HashRouter — never nest routers. Keep the multifile structure.`,
                    { source: "user" }
                  ),
              },
            });
          }
        }
      }
      if (e.data?.type === "PREVIEW_RENDERED") {
        setPreviewStatus("live");
        setPreviewError("");
        resolvePreviewWaiters("live");
      }
      if (e.data?.type === "RUNTIME_ERROR") {
        const err = shortError(e.data.error || "Unknown error", 200);
        const now = Date.now();
        if (
          lastRuntimeErrRef.current.msg === err &&
          now - lastRuntimeErrRef.current.at < 800
        ) {
          resolvePreviewWaiters("error");
          return;
        }
        lastRuntimeErrRef.current = { msg: err, at: now };
        sandboxErrorsRef.current = [
          ...sandboxErrorsRef.current.slice(-19),
          displayError(e.data.error, 400),
        ];
        setSandboxErrors([...sandboxErrorsRef.current]);
        setPreviewStatus("error");
        setPreviewError(err);
        addLog(
          `${editSourceRef.current === "manual" ? "MANUAL" : "RUNTIME"}: ${err}`,
          "error"
        );
        setTerminalOpen(true);
        resolvePreviewWaiters("error");

        if (!isGeneratingRef.current) {
          toast.error("Preview error", {
            description: err,
            action: {
              label: "Fix with AI",
              onClick: () =>
                handleSendMessage(
                  `Fix this runtime error in the workspace: "${err}". Prefer MemoryRouter or a single top-level HashRouter — never nest routers. Keep the multifile structure.`,
                  { source: "user" }
                ),
            },
          });
          // Auto-fix still runs for manual-edit breaks (same as agent breaks)
          queueAutoFix(err);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    addLog,
    handleSendMessage,
    supabaseUrl,
    supabaseAnonKey,
    resolvePreviewWaiters,
    queueAutoFix,
  ]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const pushPreview = useCallback(
    (files: Record<string, string>, soft: boolean) => {
      if (!iframeRef.current?.contentWindow || !isPreviewReady) return;
      iframeRef.current.contentWindow.postMessage(
        {
          type: "EXECUTE_CODE",
          files,
          entryPoint: files["App.tsx"] ? "App.tsx" : Object.keys(files)[0],
          supabaseUrl,
          supabaseKey: supabaseAnonKey,
          soft,
        },
        "*"
      );
    },
    [isPreviewReady, supabaseUrl, supabaseAnonKey]
  );

  // Debounced VFS → sandbox sync.
  // Soft sync only while the *agent* is streaming incomplete graphs.
  // Manual edits always hard-refresh so compile/runtime errors reach the terminal.
  useEffect(() => {
    if (!isPreviewReady) return;
    const fromManual = editSourceRef.current === "manual";
    const soft = isGenerating && !fromManual;
    const delay = isGenerating && !fromManual ? 120 : fromManual ? 280 : 220;
    const handle = window.setTimeout(() => {
      pushPreview(vfsFiles, soft);
    }, delay);
    return () => window.clearTimeout(handle);
  }, [vfsFiles, isPreviewReady, isGenerating, pushPreview]);

  useEffect(() => {
    localStorage.setItem(
      "asooju_preview_data",
      JSON.stringify({
        files: vfsFiles,
        supabaseUrl,
        supabaseKey: supabaseAnonKey,
      })
    );
  }, [vfsFiles, supabaseUrl, supabaseAnonKey]);

  const refreshPreview = useCallback(() => {
    setIsPreviewReady(false);
    setPreviewStatus("booting");
    setPreviewError("");
    setIframeNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    chatHydratedRef.current = false;
    void fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when project or auth identity changes
  }, [projectId, user?.id, isGuest]);

  // Debounced chat persist (same browser cache + project record)
  useEffect(() => {
    if (!chatHydratedRef.current) return;
    if (!projectId || projectId === "new-project" || projectId === "demo-project") return;
    if (messages.length <= 1) return;
    if (chatSaveTimerRef.current) window.clearTimeout(chatSaveTimerRef.current);
    chatSaveTimerRef.current = window.setTimeout(() => {
      writeChatCache(projectId, messages);
      void persistProject({ silent: true, messages });
    }, 900);
    return () => {
      if (chatSaveTimerRef.current) window.clearTimeout(chatSaveTimerRef.current);
    };
  }, [messages, projectId, persistProject]);

  const applyProjectPreviewEnv = useCallback(
    (row?: { preview_supabase_url?: string | null; preview_supabase_anon_key?: string | null }) => {
      const env = resolveProjectPreviewEnvFromSources(projectId, row);
      setSupabaseUrl(env.url);
      setSupabaseAnonKey(env.anonKey);
      if (projectId && (env.url || env.anonKey)) {
        writeProjectPreviewEnv(projectId, env.url, env.anonKey);
      }
    },
    [projectId]
  );

  const fetchProject = async () => {
    chatHydratedRef.current = false;
    if (!projectId || projectId === "new-project" || projectId === "demo-project") {
      setVfsFiles({ ...DEFAULT_VFS });
      applyProjectPreviewEnv();
      chatHydratedRef.current = true;
      return;
    }

    const applyVfs = (vfs: unknown, code?: string | null) => {
      if (
        vfs &&
        typeof vfs === "object" &&
        !Array.isArray(vfs) &&
        Object.keys(vfs as object).length > 0
      ) {
        const files = { ...(vfs as Record<string, string>) };
        const entry = (files["App.tsx"] || files["App.jsx"] || "").trim();
        // Older rows kept the app in `code` while vfs_files has an empty entry.
        if (!entry && code && String(code).trim().length > 200) {
          files["App.tsx"] = String(code);
        }
        setVfsFiles(files);
        return;
      }
      if (code && String(code).trim()) {
        setVfsFiles({ "App.tsx": String(code) });
        return;
      }
      setVfsFiles({ ...DEFAULT_VFS });
    };

    const applyChat = (raw: unknown, name: string, seedPrompt?: string) => {
      const cached = readChatCache(projectId);
      const preferred =
        (Array.isArray(raw) && raw.length > 0 ? raw : null) || cached;
      const next = normalizeLoadedChat(preferred, name);
      setMessages(next);
      messagesRef.current = next;

      // Restore workspace purpose from saved chat / project prompt
      const fromUser = next.find(
        (m) => m.role === "user" && m.content.trim().length > 24 && !m.meta?.autoFix
      )?.content;
      const purpose = (seedPrompt || fromUser || "").trim();
      if (purpose) {
        procedureRef.current = {
          ...procedureRef.current,
          originalPrompt: purpose,
        };
      }
      chatHydratedRef.current = true;
    };

    const signedIn = Boolean(user && !isGuest && user.id !== "guest-user-000");

    if (signedIn) {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();
        if (error) throw error;
        if (data) {
          setProjectName(data.name);
          applyVfs(data.vfs_files, data.code);
          applyProjectPreviewEnv(data);
          applyChat(
            (data as { chat_messages?: unknown }).chat_messages,
            data.name,
            data.prompt || undefined
          );
          return;
        }
      } catch (error: any) {
        console.error(error);
        toast.error("Could not load project", { description: shortError(error, 140) });
      }
    }

    const local = readLocalProjects().find((p) => p.id === projectId);
    if (local) {
      setProjectName(local.name);
      applyVfs(local.vfs_files, local.code);
      applyProjectPreviewEnv(local);
      applyChat(local.chat_messages, local.name, local.prompt);
      return;
    }

    if (!signedIn) {
      toast.error("Project not found locally");
    }
    chatHydratedRef.current = true;
  };

  const handleCodeChange = (value: string) => {
    editSourceRef.current = "manual";
    setVfsFiles((prev) => ({ ...prev, [selectedFile]: value }));
    // Debounced terminal line so keystrokes aren't ignored — but don't spam every char
    if (manualEditLogTimerRef.current) window.clearTimeout(manualEditLogTimerRef.current);
    manualEditLogTimerRef.current = window.setTimeout(() => {
      addLog(`Manual edit · ${selectedFile}`, "info");
      setTerminalOpen(true);
    }, 700);
  };

  const handleSave = async () => {
    if (!user && !isGuest) return toast.error("Sign in required");
    const tid = toast.loading("Saving...");
    const ok = await persistProject({ silent: true });
    if (ok) {
      toast.success(isGuest || user?.id === "guest-user-000" ? "Saved locally" : "Saved", {
        id: tid,
      });
      addLog(
        isGuest || user?.id === "guest-user-000" ? "Saved locally" : "Saved to cloud",
        "success"
      );
    } else {
      toast.error("Save failed", { id: tid });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

  const handlePublish = () => {
    navigate(`/export/${projectId || "demo"}`);
  };

  const onSettingsSave = async () => {
    setIsValidatingSettings(true);
    localStorage.setItem("asooju_openai_key", providerKeys.openai || "");
    localStorage.setItem("asooju_gemini_key", providerKeys.gemini || "");
    localStorage.setItem("asooju_grok_key", providerKeys.grok || "");
    localStorage.setItem("asooju_claude_key", providerKeys.claude || "");
    localStorage.setItem("asooju_deepseek_key", providerKeys.deepseek || "");
    localStorage.setItem("asooju_active_provider", activeProvider);
    const previewUrl = supabaseUrl.trim();
    const previewKey = supabaseAnonKey.trim();
    if (projectId) {
      writeProjectPreviewEnv(projectId, previewUrl, previewKey);
      const guest = isGuest || !user || user.id === "guest-user-000";
      if (guest && projectId !== "new-project" && projectId !== "demo-project") {
        const projects = readLocalProjects();
        const idx = projects.findIndex((p) => p.id === projectId);
        if (idx >= 0) {
          projects[idx] = {
            ...projects[idx],
            preview_supabase_url: previewUrl,
            preview_supabase_anon_key: previewKey,
          };
          writeLocalProjects(projects);
        }
      } else if (!guest && projectId !== "new-project" && projectId !== "demo-project") {
        const { error } = await supabase
          .from("projects")
          .update({
            preview_supabase_url: previewUrl || null,
            preview_supabase_anon_key: previewKey || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
        if (error) {
          const missingCol =
            /preview_supabase/i.test(error.message || "") || error.code === "PGRST204";
          if (!missingCol) {
            toast.error("Could not save Supabase settings", {
              description: shortError(error, 120),
            });
          } else {
            addLog(
              "Preview Supabase saved in this browser only — re-run supabase/schema.sql to sync to cloud.",
              "info"
            );
          }
        }
      }
    }
    setIsValidatingSettings(false);
    setSettingsOpen(false);
    toast.success("Settings saved");
  };

  const previewPanel = (
    <BuilderPreviewPanel
      viewMode={viewMode}
      setViewMode={setViewMode}
      selectedFile={selectedFile}
      fileContent={vfsFiles[selectedFile] || ""}
      onCodeChange={handleCodeChange}
      isPreviewReady={isPreviewReady}
      iframeRef={iframeRef}
      hasVfs={Object.keys(vfsFiles).length > 0}
      hideModeToggle
      sandboxKey={iframeNonce}
      isGenerating={isGenerating}
      progress={genProgress}
      buildingFiles={buildingFiles}
      buildingLabel={
        agentSteps.find((s) => s.status === "active")?.label ||
        (isGenerating ? "Building your app…" : undefined)
      }
      previewStatus={previewStatus}
      previewError={previewError}
      onRefresh={refreshPreview}
      onFixError={() => {
        autoFixCountRef.current = 0;
        handleSendMessage(
          `Fix this runtime error in the workspace: "${previewError}". Prefer a single top-level MemoryRouter/HashRouter in App.tsx — never nest routers. Keep multifile structure. Explain the failure and the fix.`,
          { source: "user" }
        );
      }}
      sandpackPreview={sandpackPreview}
      onToggleSandpackPreview={() => {
        setSandpackPreview((on) => {
          const next = !on;
          setSandpackPreviewEnabled(next);
          return next;
        });
      }}
      vfsFiles={vfsFiles}
      projectName={projectName}
      onSandpackVerify={handleSandpackVerify}
    />
  );

  const showFiles = !isMobile && viewMode === "code" && filesPanelOpen;
  const chatPanel = (
    <BuilderChatPanel
      isMobile={isMobile}
      messages={messages}
      isGenerating={isGenerating}
      chatInput={chatInput}
      setChatInput={setChatInput}
      handleSendMessage={handleSendMessage}
      thought={agentThought}
      liveLog={agentLiveLog}
      moodLabel={moodMeta(agentMood).label}
      moodEmoji={moodMeta(agentMood).emoji}
      steps={agentSteps}
      progress={genProgress}
      autoFixEnabled={autoFixEnabled}
      onToggleAutoFix={() => setAutoFixEnabled((v) => !v)}
      creditsLabel={byok ? "BYOK ∞" : Number.isFinite(remaining) ? `${remaining} credits` : undefined}
      agentMode={agentMode}
      onAgentModeChange={setAgentMode}
      onApprovePlan={handleApprovePlan}
      onApproveBrief={handleApproveBrief}
      briefApprovalVisible={
        agentMode !== "build" &&
        requiresBriefApproval(vfsFiles, !procedure.briefApproved)
      }
      briefReady={briefGate.ready}
      briefSummary={briefGate.summary}
      onContinueWave={handleContinueWave}
      onPauseProcedure={handlePauseProcedure}
      onAnswerQuestion={handleAnswerQuestion}
      pendingAnswers={pendingAnswers}
      planInteractive={procedure.phase === "awaiting_plan"}
      checkpointInteractive={procedure.phase === "awaiting_continue"}
      vfs={vfsFiles}
      previewError={previewError}
      procedurePhase={procedure.phase}
      hasMoreWaves={
        procedure.phase === "awaiting_continue" ||
        (procedure.phase === "building" && procedure.wave + 1 < procedure.maxWaves)
      }
      onStop={handleStop}
      onUndo={handleUndo}
      canUndo={canUndo}
      queuedCount={queuedCount}
    />
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden overflow-hidden bg-[#020202] text-white selection:bg-primary/30">
      <BuilderToolbar
        projectName={projectName}
        projectId={projectId || ""}
        isMobile={isMobile}
        mobileExplorerOpen={mobileExplorerOpen}
        setMobileExplorerOpen={setMobileExplorerOpen}
        handleSave={handleSave}
        handleShare={handleShare}
        handleSettings={() => setSettingsOpen(true)}
        handlePublish={handlePublish}
        isPublishing={isPublishing}
        rightPanelOpen={rightPanelOpen}
        setRightPanelOpen={setRightPanelOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filesPanelOpen={filesPanelOpen}
        setFilesPanelOpen={setFilesPanelOpen}
      />

      <div className="flex-1 relative z-10 flex overflow-hidden min-h-0">
        {isMobile ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 border-b border-white/[0.06]">
              <button
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider ${
                  activeMobileTab === "editor" ? "text-primary" : "text-white/30"
                }`}
                onClick={() => setActiveMobileTab("editor")}
              >
                Workspace
              </button>
              <button
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider ${
                  activeMobileTab === "chat" ? "text-primary" : "text-white/30"
                }`}
                onClick={() => setActiveMobileTab("chat")}
              >
                Agent
              </button>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {activeMobileTab === "editor" ? previewPanel : chatPanel}
            </div>
          </div>
        ) : (
          <PanelGroup direction="horizontal" autoSaveId="asooju-builder-layout">
            {showFiles && (
              <>
                <Panel
                  id="files"
                  order={1}
                  defaultSize={14}
                  minSize={10}
                  maxSize={24}
                  collapsible
                  onCollapse={() => setFilesPanelOpen(false)}
                  className="flex flex-col bg-[#080808] border-r border-white/[0.06]"
                >
                  <div className="h-9 px-3 border-b border-white/[0.06] flex items-center shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                      Files · {Object.keys(vfsFiles).length}
                    </span>
                  </div>
                  <BuilderFileTree
                    fileTree={dynamicFileTree as any}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                  />
                </Panel>
                <ResizeHandle />
              </>
            )}

            <Panel
              id="canvas"
              order={2}
              defaultSize={showFiles ? (rightPanelOpen ? 58 : 86) : rightPanelOpen ? 72 : 100}
              minSize={40}
              className="flex flex-col bg-[#050505] overflow-hidden min-w-0"
            >
              {previewPanel}
              <BuilderTerminal
                terminalOpen={terminalOpen}
                setTerminalOpen={setTerminalOpen}
                terminalLogs={terminalLogs}
              />
            </Panel>

            {rightPanelOpen && (
              <>
                <ResizeHandle />
                <Panel
                  id="agent"
                  order={3}
                  defaultSize={showFiles ? 28 : 28}
                  minSize={22}
                  maxSize={40}
                  collapsible
                  onCollapse={() => setRightPanelOpen(false)}
                  className="min-w-0 overflow-hidden"
                >
                  {chatPanel}
                </Panel>
              </>
            )}
          </PanelGroup>
        )}
      </div>

      {bundlerVerifyActive && !sandpackPreview && (
        <div
          className="fixed w-0 h-0 overflow-hidden opacity-0 pointer-events-none"
          aria-hidden
        >
          <BuilderSandpackPreview
            vfs={vfsFiles}
            projectName={projectName}
            onSandpackVerify={handleSandpackVerify}
          />
        </div>
      )}

      <BuilderSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeProvider={activeProvider}
        setActiveProvider={(p) => {
          setActiveProvider(p);
          localStorage.setItem("asooju_active_provider", p);
        }}
        providerKeys={providerKeys}
        setProviderKey={setProviderKey}
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
        setSupabaseAnonKey={setSupabaseAnonKey}
        isValidating={isValidatingSettings}
        onSave={onSettingsSave}
      />
    </div>
  );
};

export default ProjectBuilder;
