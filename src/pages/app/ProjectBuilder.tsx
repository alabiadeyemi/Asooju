import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateArchitectureStream, generateBuildPlan } from "@/services/ai-service";
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
import { formatAgentReply } from "@/lib/generation-prompt";
import type { ChatAttachment } from "@/lib/attachments";
import { useBilling } from "@/hooks/use-billing";
import { waveBudget } from "@/lib/complexity";
import {
  emptyProcedure,
  formatPlanChatIntro,
  formatWaveCompleteChat,
  initSessionFromPrompt,
  isContinueIntent,
  isPauseIntent,
  planToApprovedBrief,
  type AgentChatMode,
  type ProcedureSession,
} from "@/lib/agent-procedure";

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
  const messageQueueRef = useRef<
    Array<{ prompt: string; attachments: ChatAttachment[] }>
  >([]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isValidatingSettings, setIsValidatingSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(
    () => localStorage.getItem("shipkernel_auto_fix") !== "0"
  );
  const [agentMode, setAgentMode] = useState<AgentChatMode>(() =>
    localStorage.getItem("shipkernel_agent_mode") === "plan" ? "plan" : "build"
  );
  const [procedure, setProcedure] = useState<ProcedureSession>(() => emptyProcedure());
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({});
  const [canUndo, setCanUndo] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

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
    localStorage.setItem("shipkernel_auto_fix", autoFixEnabled ? "1" : "0");
  }, [autoFixEnabled]);

  useEffect(() => {
    localStorage.setItem("shipkernel_agent_mode", agentMode);
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

  // Files explorer only in code mode (Lovable-style)
  useEffect(() => {
    if (viewMode === "preview") setFilesPanelOpen(false);
    else setFilesPanelOpen(true);
  }, [viewMode]);

  const [chatInput, setChatInput] = useState("");
  const [agentThought, setAgentThought] = useState("");
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
        "Describe what to build — or drop a screenshot. Build mode runs end-to-end (auto-continues steps + auto-fix). Switch to Plan when you want to approve an approach first.",
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

  const [activeProvider, setActiveProvider] = useState(
    () => localStorage.getItem("shipkernel_active_provider") || "gemini"
  );
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>(() => ({
    openai: localStorage.getItem("shipkernel_openai_key") || "",
    gemini:
      localStorage.getItem("shipkernel_gemini_key") ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      "",
    grok: localStorage.getItem("shipkernel_grok_key") || "",
    claude: localStorage.getItem("shipkernel_claude_key") || "",
    deepseek:
      localStorage.getItem("shipkernel_deepseek_key") ||
      import.meta.env.VITE_DEEPSEEK_API_KEY ||
      "",
  }));
  const setProviderKey = (provider: string, key: string) => {
    setProviderKeys((prev) => ({ ...prev, [provider]: key }));
  };
  const [supabaseUrl, setSupabaseUrl] = useState(() => import.meta.env.VITE_SUPABASE_URL || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    () => import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
  );

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
      const sig = err.slice(0, 160);
      if (autoFixTimerRef.current) window.clearTimeout(autoFixTimerRef.current);
      autoFixTimerRef.current = window.setTimeout(() => {
        if (isGeneratingRef.current) return;
        autoFixCountRef.current += 1;
        lastAutoFixSigRef.current = sig;
        addLog(`Auto-fix attempt ${autoFixCountRef.current}/${AUTO_FIX_MAX}`, "agent");
        void sendMessageRef.current(
          `Fix this runtime/preview error surgically (minimal diffs): "${err}". Prefer a single top-level MemoryRouter or HashRouter in App.tsx — never nest routers. Keep multifile structure. Explain what failed and what you changed.`,
          { source: "autofix" }
        );
      }, 700);
    },
    [autoFixEnabled, addLog]
  );

  const beginGeneratingUi = useCallback(
    (steps: AgentStep[], opts?: { snapshot?: boolean }) => {
      if (opts?.snapshot !== false && !vfsBackupRef.current) {
        vfsBackupRef.current = { ...vfsRef.current };
        setCanUndo(false);
      }
      setIsGenerating(true);
      isGeneratingRef.current = true;
      setRightPanelOpen(true);
      setActiveMobileTab("chat");
      setGenProgress(8);
      setAgentThought("");
      setBuildingFiles([]);
      setPreviewError("");
      setPreviewStatus("building");
      setAgentSteps(steps);
    },
    []
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

        const userPrompt = [
          session.originalPrompt,
          brief ? `\n\nApproved plan:\n${brief}` : "",
          focus ? `\n\nUser focus for this step:\n${focus}` : "",
          `\n\nExecute ONLY wave ${wave + 1} of ${maxWaves}. Do not finish the entire product in one pass.`,
        ]
          .filter(Boolean)
          .join("");

        setProcedure((p) => ({ ...p, phase: "building" }));
        procedureRef.current = { ...procedureRef.current, phase: "building" };
        beginGeneratingUi(
          [
            {
              id: "wave",
              label: `Step ${wave + 1}/${maxWaves}`,
              status: "active",
              kind: "status",
            },
            { id: "read", label: "Reading workspace", status: "pending", kind: "tool" },
            { id: "think", label: "Planning this step", status: "pending", kind: "think" },
            { id: "write", label: "Writing files", status: "pending", kind: "file" },
            { id: "verify", label: "Verifying preview", status: "pending", kind: "tool" },
          ],
          { snapshot: wave === 0 }
        );
        addLog(`Building step ${wave + 1}/${maxWaves}…`, "agent");

        const errorContext = sandboxErrorsRef.current.slice(-5).join("\n") || "None";
        let nextVfs = { ...vfsRef.current };
        let wroteAny = false;
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
                upsertStep({
                  id: "read",
                  label: event.message.replace(/…$/, "") || "Connecting to model",
                  status: "active",
                  kind: "status",
                });
                setGenProgress((p) => Math.max(p, 15));
              }
              if (event.type === "thought") {
                setAgentThought(event.text);
                upsertStep({ id: "read", label: "Workspace loaded", status: "done", kind: "tool" });
                upsertStep({
                  id: "think",
                  label: "Planning this step",
                  detail: event.text.slice(0, 100),
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
                upsertStep({ id: "think", label: "Plan ready", status: "done", kind: "think" });
                upsertStep({
                  id: `file:${event.file.path}`,
                  label: `Edited ${event.file.path}`,
                  detail: `${event.index + 1} of ${event.total}`,
                  status: "done",
                  kind: "file",
                });
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
            {
              projectName,
              wave,
              scale,
              targetPaths: session.nextPaths.length ? session.nextPaths : undefined,
            }
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
          upsertStep({
            id: "verify",
            label: "Verifying preview",
            status: "active",
            kind: "tool",
          });

          filePaths = (response.files || []).map((f) => f.path);
          nextPaths = response.next_paths || [];
          hasMore = wave + 1 < maxWaves;

          const reply = formatWaveCompleteChat(
            wave,
            maxWaves,
            response.thought,
            filePaths,
            nextPaths
          );

          const willAutoContinue =
            hasMore && autonomous && !pauseAutonomyRef.current && !abortGenRef.current;

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: willAutoContinue
                ? `${reply}\n\nContinuing to step ${wave + 2}…`
                : reply,
              meta: {
                kind: "checkpoint",
                files: filePaths,
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
          if (outcome === "live" || outcome === "timeout") {
            sandboxErrorsRef.current = [];
            setSandboxErrors([]);
            setPreviewStatus("live");
            setPreviewError("");
            upsertStep({
              id: "verify",
              label: outcome === "live" ? "Preview healthy" : "Preview settle timed out",
              status: "done",
              kind: "tool",
            });
            toast.success(
              filePaths.length
                ? `Step ${wave + 1}: ${filePaths.length} file${filePaths.length === 1 ? "" : "s"}`
                : `Step ${wave + 1} done`
            );
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
            // Autonomy: auto-fix, then continue waves after fix path
            if (autoFixEnabled && autoFixCountRef.current < AUTO_FIX_MAX) {
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
              };
              procedureRef.current = nextSession;
              setProcedure(nextSession);
              setCanUndo(Boolean(vfsBackupRef.current));
              break;
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
          addLog(`Generation failed: ${shortError(error)}`, "error");
          toast.error("Generation failed", { description: shortError(error, 140) });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${detail}\n\nI’ll keep retrying network blips automatically. Check your API key in Settings if this persists.`,
            },
          ]);
          setTerminalOpen(true);
          setProcedure((p) => ({ ...p, phase: "idle" }));
          procedureRef.current = { ...procedureRef.current, phase: "idle" };
          break;
        }
      }

      setIsGenerating(false);
      isGeneratingRef.current = false;
      setGenProgress(0);
      void refreshBilling();
      drainMessageQueue();
    },
    [
      addLog,
      upsertStep,
      supabaseUrl,
      supabaseAnonKey,
      projectName,
      waitForPreviewOutcome,
      autoFixEnabled,
      refreshBilling,
      queueAutoFix,
      beginGeneratingUi,
      agentMode,
      drainMessageQueue,
    ]
  );

  useEffect(() => {
    runWaveRef.current = runBuildWave;
  }, [runBuildWave]);

  const runPlanPhase = useCallback(
    async (prompt: string, attachments: ChatAttachment[], session: ProcedureSession) => {
      setProcedure({ ...session, phase: "planning" });
      beginGeneratingUi([
        { id: "read", label: "Reading workspace", status: "active", kind: "tool" },
        { id: "think", label: "Drafting plan", status: "pending", kind: "think" },
      ]);
      addLog("Plan mode: drafting approach…", "agent");
      setPendingAnswers({});

      try {
        const plan = await generateBuildPlan(
          prompt,
          vfsRef.current,
          (event) => {
            if (event.type === "status") {
              addLog(event.message, "agent");
              upsertStep({
                id: "read",
                label: event.message.replace(/…$/, "") || "Connecting",
                status: "active",
                kind: "status",
              });
              setGenProgress((p) => Math.max(p, 20));
            }
            if (event.type === "thought") {
              setAgentThought(event.text);
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
          { projectName, attachments, scale: session.scale }
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

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: formatPlanChatIntro(plan),
            meta: { kind: "plan", plan },
          },
        ]);
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
        void refreshBilling();
      }
    },
    [addLog, upsertStep, projectName, beginGeneratingUi, refreshBilling]
  );

  const handleApprovePlan = useCallback(() => {
    const session = procedureRef.current;
    if (session.phase !== "awaiting_plan" || isGeneratingRef.current) return;
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
    const next = { ...session, mode: "build" as const, phase: "building" as const, wave: 0 };
    procedureRef.current = next;
    setProcedure(next);
    void runWaveRef.current();
  }, []);

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

      // Autofix: single surgical build, skip plan
      if (source === "autofix") {
        beginGeneratingUi([
          { id: "read", label: "Reading workspace", status: "active", kind: "tool" },
          { id: "think", label: "Diagnosing", status: "pending", kind: "think" },
          { id: "write", label: "Applying fix", status: "pending", kind: "file" },
          { id: "verify", label: "Verifying preview", status: "pending", kind: "tool" },
        ]);
        addLog(`Auto-fix: ${userPrompt.slice(0, 80)}…`, "agent");
        const errorContext = sandboxErrorsRef.current.slice(-5).join("\n") || "None";
        let nextVfs = { ...vfsRef.current };
        let wroteAny = false;
        try {
          const response = await generateArchitectureStream(
            userPrompt,
            vfsRef.current,
            errorContext,
            (event) => {
              if (event.type === "status") {
                addLog(event.message, "agent");
                upsertStep({
                  id: "read",
                  label: event.message.replace(/…$/, "") || "Connecting",
                  status: "active",
                  kind: "status",
                });
              }
              if (event.type === "thought") {
                setAgentThought(event.text);
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
                upsertStep({
                  id: `file:${event.file.path}`,
                  label: `Edited ${event.file.path}`,
                  status: "done",
                  kind: "file",
                });
                upsertStep({
                  id: "write",
                  label: "Applying fix",
                  status: "active",
                  kind: "file",
                });
              }
            },
            { projectName, attachments, scale: "simple", wave: 0 }
          );
          for (const action of response.actions || []) {
            if (action.type === "delete_file" && action.path) delete nextVfs[action.path];
          }
          setVfsFiles({ ...nextVfs });
          upsertStep({ id: "write", label: wroteAny ? "Fix applied" : "No changes", status: "done", kind: "file" });
          upsertStep({ id: "verify", label: "Verifying preview", status: "active", kind: "tool" });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: formatAgentReply(response.thought, response.plan || [], response.files || [], {
                autoFix: true,
              }),
              meta: { autoFix: true, files: (response.files || []).map((f) => f.path) },
            },
          ]);
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
          if (outcome === "live" || outcome === "timeout") {
            sandboxErrorsRef.current = [];
            setSandboxErrors([]);
            setPreviewStatus("live");
            setPreviewError("");
            upsertStep({ id: "verify", label: "Preview healthy", status: "done", kind: "tool" });
            autoFixCountRef.current = 0;
          } else {
            upsertStep({ id: "verify", label: "Still erroring", status: "done", kind: "tool" });
            setPreviewStatus("error");
            const err =
              sandboxErrorsRef.current[sandboxErrorsRef.current.length - 1] ||
              "Unknown preview error";
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
          void refreshBilling();
        }
        return;
      }

      // New request — plan first only in Plan mode; Build is fully autonomous
      const session = initSessionFromPrompt(userPrompt, vfsRef.current, agentMode, source);
      session.mode = agentMode;
      procedureRef.current = session;
      setProcedure(session);
      vfsBackupRef.current = null;
      pauseAutonomyRef.current = false;
      abortGenRef.current = false;

      if (session.phase === "planning") {
        await runPlanPhase(userPrompt, attachments, session);
        return;
      }

      // Direct autonomous build
      const building = { ...session, phase: "building" as const, wave: 0, mode: agentMode };
      procedureRef.current = building;
      setProcedure(building);
      await runBuildWave();
    },
    [
      chatInput,
      addLog,
      upsertStep,
      supabaseUrl,
      supabaseAnonKey,
      projectName,
      waitForPreviewOutcome,
      autoFixEnabled,
      refreshBilling,
      queueAutoFix,
      beginGeneratingUi,
      runPlanPhase,
      runBuildWave,
      agentMode,
      handlePauseProcedure,
    ]
  );

  useEffect(() => {
    sendMessageRef.current = handleSendMessage;
  }, [handleSendMessage]);

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
          setPreviewStatus("error");
          setPreviewError(String(e.data.message));
          resolvePreviewWaiters("error");
        }
      }
      if (e.data?.type === "PREVIEW_RENDERED") {
        setPreviewStatus("live");
        setPreviewError("");
        resolvePreviewWaiters("live");
      }
      if (e.data?.type === "RUNTIME_ERROR") {
        const err = shortError(e.data.error || "Unknown error", 200);
        sandboxErrorsRef.current = [
          ...sandboxErrorsRef.current.slice(-19),
          displayError(e.data.error, 400),
        ];
        setSandboxErrors([...sandboxErrorsRef.current]);
        setPreviewStatus("error");
        setPreviewError(err);
        addLog(`RUNTIME: ${err}`, "error");
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

  // Debounced VFS → sandbox sync (faster while generating for live feel)
  useEffect(() => {
    if (!isPreviewReady) return;
    const delay = isGenerating ? 120 : 220;
    const handle = window.setTimeout(() => {
      pushPreview(vfsFiles, isGenerating);
    }, delay);
    return () => window.clearTimeout(handle);
  }, [vfsFiles, isPreviewReady, isGenerating, pushPreview]);

  useEffect(() => {
    localStorage.setItem(
      "shipkernel_preview_data",
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
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    if (!projectId || projectId === "new-project" || projectId === "demo-project") {
      setVfsFiles({ ...DEFAULT_VFS });
      return;
    }

    const local = readLocalProjects().find((p) => p.id === projectId);
    if (local) {
      setProjectName(local.name);
      setVfsFiles(local.vfs_files || { "App.tsx": local.code || DEFAULT_VFS["App.tsx"] });
      setMessages([
        {
          role: "assistant",
          content: `Loaded local project "${local.name}".${local.prompt ? ` Original prompt: ${local.prompt}` : ""}`,
        },
      ]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      if (!data) return;

      setProjectName(data.name);
      if (data.vfs_files && typeof data.vfs_files === "object") {
        setVfsFiles(data.vfs_files as Record<string, string>);
      } else {
        setVfsFiles({ "App.tsx": data.code || DEFAULT_VFS["App.tsx"] });
      }
      setMessages([
        {
          role: "assistant",
          content: `Loaded "${data.name}". Describe changes and I’ll update the files.`,
        },
      ]);
    } catch (error: any) {
      console.error(error);
      toast.error("Could not load project", { description: shortError(error, 140) });
    }
  };

  const handleCodeChange = (value: string) => {
    setVfsFiles((prev) => ({ ...prev, [selectedFile]: value }));
  };

  const handleSave = async () => {
    if (!user) return toast.error("Sign in required");
    const tid = toast.loading("Saving...");
    const code = deriveCodeFromVfs(vfsFiles);

    try {
      if (isGuest || user.id === "guest-user-000") {
        const projects = readLocalProjects();
        const idx = projects.findIndex((p) => p.id === projectId);
        const record = {
          id: projectId || crypto.randomUUID(),
          name: projectName,
          prompt: "",
          vfs_files: vfsFiles,
          code,
          created_at: new Date().toISOString(),
          user_id: "guest-user-000",
        };
        if (idx >= 0) projects[idx] = { ...projects[idx], ...record, created_at: projects[idx].created_at };
        else projects.unshift(record);
        writeLocalProjects(projects);
        toast.success("Saved locally", { id: tid });
        return;
      }

      const { error } = await supabase
        .from("projects")
        .update({
          vfs_files: vfsFiles,
          code,
          name: projectName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId!);
      if (error) throw error;
      toast.success("Saved", { id: tid });
      addLog("Saved to cloud", "success");
    } catch (e: any) {
      toast.error("Save failed", { id: tid, description: shortError(e, 140) });
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
    localStorage.setItem("shipkernel_openai_key", providerKeys.openai || "");
    localStorage.setItem("shipkernel_gemini_key", providerKeys.gemini || "");
    localStorage.setItem("shipkernel_grok_key", providerKeys.grok || "");
    localStorage.setItem("shipkernel_claude_key", providerKeys.claude || "");
    localStorage.setItem("shipkernel_deepseek_key", providerKeys.deepseek || "");
    localStorage.setItem("shipkernel_active_provider", activeProvider);
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
    />
  );

  const showFiles = !isMobile && viewMode === "code" && filesPanelOpen;
  const chatPanel = (
    <BuilderChatPanel
      messages={messages}
      isGenerating={isGenerating}
      chatInput={chatInput}
      setChatInput={setChatInput}
      handleSendMessage={handleSendMessage}
      thought={agentThought}
      steps={agentSteps}
      progress={genProgress}
      autoFixEnabled={autoFixEnabled}
      onToggleAutoFix={() => setAutoFixEnabled((v) => !v)}
      creditsLabel={byok ? "BYOK ∞" : Number.isFinite(remaining) ? `${remaining} credits` : undefined}
      agentMode={agentMode}
      onAgentModeChange={setAgentMode}
      onApprovePlan={handleApprovePlan}
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
    <div className="flex flex-col h-full min-h-0 bg-[#020202] text-white overflow-hidden selection:bg-primary/30">
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
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex border-b border-white/[0.06]">
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
            {activeMobileTab === "editor" ? previewPanel : chatPanel}
          </div>
        ) : (
          <PanelGroup direction="horizontal" autoSaveId="shipkernel-builder-layout">
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
                  className="min-w-0"
                >
                  {chatPanel}
                </Panel>
              </>
            )}
          </PanelGroup>
        )}
      </div>

      <BuilderSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeProvider={activeProvider}
        setActiveProvider={(p) => {
          setActiveProvider(p);
          localStorage.setItem("shipkernel_active_provider", p);
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
