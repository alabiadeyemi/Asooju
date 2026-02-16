import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateArchitecture, validateOpenAIKey, validateGeminiKey, validateGrokKey } from "@/services/ai-service";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, PanelGroup } from "react-resizable-panels";
import { transpileCode } from '@/utils/transpiler';
import { AgentOverlay } from "@/components/app/AgentOverlay";

// UI Components
import { BuilderToolbar } from "@/components/app/builder/BuilderToolbar";
import { BuilderFileTree } from "@/components/app/builder/BuilderFileTree";
import { BuilderChatPanel } from "@/components/app/builder/BuilderChatPanel";
import { BuilderTerminal } from "@/components/app/builder/BuilderTerminal";
import { BuilderSettingsDialog } from "@/components/app/builder/BuilderSettingsDialog";
import { BuilderPreviewPanel } from "@/components/app/builder/BuilderPreviewPanel";
import { ResizeHandle } from "@/components/app/builder/ResizeHandle";

// Constants & Types
import { mockCode as initialAppCode, chatMessages } from "./builder-constants";

// Helper to convert flat VFS to Tree Structure
const buildFileTree = (files: Record<string, string>) => {
  const root: any[] = [];
  Object.keys(files).forEach(path => {
    const parts = path.split('/');
    let currentLevel = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let existing = currentLevel.find(n => n.name === part);
      if (!existing) {
        existing = { name: part, type: isFile ? 'file' : 'folder', children: isFile ? undefined : [] };
        currentLevel.push(existing);
      }
      if (!isFile) currentLevel = existing.children;
    });
  });
  return root;
};

const ProjectBuilder = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Status States
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isValidatingSettings, setIsValidatingSettings] = useState(false);

  // UI States
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview">("preview");
  const [activeMobileTab, setActiveMobileTab] = useState<"editor" | "chat">("editor");

  // Project Data States
  const [projectName, setProjectName] = useState("My Project");
  const [selectedFile, setSelectedFile] = useState("App.tsx");
  const [vfsFiles, setVfsFiles] = useState<Record<string, string>>({
    'App.tsx': initialAppCode,
    'components/Navbar.tsx': "import React from 'react';\n\nexport const Navbar = () => (\n  <nav className='p-4 border-b border-white/10 flex justify-between'>\n    <div className='font-bold text-primary'>PROJECT FORGE</div>\n    <div className='flex gap-4 text-[10px] font-bold uppercase tracking-widest opacity-50'>\n      <span>Docs</span>\n      <span>Cloud</span>\n    </div>\n  </nav>\n);",
    'components/Dashboard.tsx': "import React from 'react';\n\nexport const Dashboard = () => (\n  <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-8'>\n    {[1, 2, 3].map(i => (\n      <div key={i} className='bg-white/5 rounded-2xl border border-white/10 p-6 backdrop-blur-xl shadow-xl'>\n        <div className='text-[9px] uppercase opacity-30 font-black tracking-widest'>System Metric 0{i}</div>\n        <div className='text-3xl font-black mt-2'>99.9<span className='text-xs text-primary ml-1'>%</span></div>\n        <div className='mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden'>\n           <div className='h-full bg-primary w-2/3' />\n        </div>\n      </div>\n    ))}\n  </div>\n);",
    'index.css': "body { margin: 0; background: #000; color: #fff; font-family: 'Inter', sans-serif; }"
  });
  const dynamicFileTree = buildFileTree(vfsFiles);
  const [compiledCode, setCompiledCode] = useState({ code: '', componentName: 'App' });
  const [previewPath, setPreviewPath] = useState("/");

  // AI / Log States
  const [chatInput, setChatInput] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [agentThought, setAgentThought] = useState("");
  const [agentFiles, setAgentFiles] = useState<string[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [sandboxErrors, setSandboxErrors] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; content: string }[]>(chatMessages);
  const [terminalLogs, setTerminalLogs] = useState<{ id: string; time: string; level: 'info' | 'error' | 'success' | 'agent'; message: string }[]>([
    { id: '1', time: new Date().toLocaleTimeString(), level: 'info', message: 'Workspace initialized. Neural link standby.' }
  ]);

  // Settings / API States
  const activeProvider = (typeof window !== 'undefined' ? localStorage.getItem('shipkernel_active_provider') : "openai") || "openai";
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem('shipkernel_openai_key') || "");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('shipkernel_gemini_key') || "");
  const [grokKey, setGrokKey] = useState(() => localStorage.getItem('shipkernel_grok_key') || "");
  const [supabaseUrl, setSupabaseUrl] = useState(() => import.meta.env.VITE_SUPABASE_URL || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "");

  // -- Helpers --
  const addLog = (message: string, level: 'info' | 'error' | 'success' | 'agent' = 'info') => {
    setTerminalLogs(prev => [...prev.slice(-49), {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      level,
      message
    }]);
  };

  // -- Effects --

  // Auto-transpile code changes (Deprecated for VFS but kept for backward compatibility if needed)
  useEffect(() => {
    const codeToCompile = vfsFiles[selectedFile] || initialAppCode;
    const result = transpileCode(codeToCompile);
    if ('error' in result) {
      console.error('[Transpiler] Failed:', result.error);
      setCompiledCode({ code: '', componentName: 'App' });
    } else {
      setCompiledCode(result);
    }
  }, [vfsFiles, selectedFile]);

  // Handle Sandbox Messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'PREVIEW_READY') setIsPreviewReady(true);
      if (e.data.type === 'RUNTIME_ERROR') {
        const err = e.data.error;
        console.error("[Sandbox Error]:", err);
        setSandboxErrors(prev => [...prev, err]);
        addLog(`RUNTIME ERROR: ${err}`, 'error');
        toast.error("Runtime Violation", {
          description: err,
          action: {
            label: "Fix with AI",
            onClick: () => handleSendMessage(`I am getting a runtime error: "${err}". Please fix the code.`)
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync code to Sandbox
  useEffect(() => {
    if (iframeRef.current?.contentWindow && isPreviewReady) {
      iframeRef.current.contentWindow.postMessage({
        type: 'EXECUTE_CODE',
        files: vfsFiles,
        entryPoint: 'App.tsx',
        supabaseUrl,
        supabaseKey: supabaseAnonKey
      }, '*');
    }
  }, [vfsFiles, isPreviewReady, supabaseUrl, supabaseAnonKey]);

  // Persistence to localStorage for standalone tabs
  useEffect(() => {
    if (Object.keys(vfsFiles).length > 0) {
      localStorage.setItem('shipkernel_preview_data', JSON.stringify({
        files: vfsFiles,
        path: previewPath,
        supabaseUrl,
        supabaseKey: supabaseAnonKey
      }));
    }
  }, [vfsFiles, previewPath, supabaseUrl, supabaseAnonKey]);

  // Initial Fetch
  useEffect(() => {
    const isMockId = projectId === 'new-project' || projectId === 'demo-project';
    if (projectId && !isMockId) fetchProject();
  }, [projectId]);

  // -- Handlers --

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      if (data) {
        setProjectName(data.name);
        if (data.vfs_files) {
          setVfsFiles(data.vfs_files);
        } else {
          setVfsFiles({ 'App.tsx': data.code || initialAppCode });
        }
        if (data.prompt) setLastPrompt(data.prompt);
        setMessages([{ role: "assistant", content: `Syncing architecture for "${data.name}". Neural link ready.` }]);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error("Cloud Retrieval Failed", { description: "Reverting to local simulation." });
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const userPrompt = customPrompt || chatInput;
    if (!userPrompt.trim()) return;

    setLastPrompt(userPrompt);
    setMessages(prev => [...prev, { role: "user", content: userPrompt }]);
    setChatInput("");
    setIsGenerating(true);
    setGenProgress(10);
    setSandboxErrors([]);
    addLog(`AI INITIATING: ${userPrompt.substring(0, 50)}...`, 'agent');

    try {
      const response = await generateArchitecture(userPrompt, vfsFiles, sandboxErrors.join('\n'));

      const plan = response.plan || ["Synthesizing logic...", "Optimizing UI..."];
      const actions = response.actions || [];

      for (let i = 0; i < plan.length; i++) {
        setAgentLogs(l => [...l, plan[i]]);
        setGenProgress(20 + ((i + 1) / (plan.length + actions.length)) * 75);
        await new Promise(r => setTimeout(r, 600));
      }

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        if (action.type === 'apply_sql' && action.sql) {
          try {
            const { data, error } = await supabase.rpc('exec_sql', { sql_cmd: action.sql });
            if (error) throw error;
            addLog(`SQL SUCCESS: Table materialized.`, 'success');
          } catch (err) {
            console.warn("SQL Bridge skipped.");
          }
        }
      }

      setGenProgress(100);
      setAgentThought(response.thought);
      setAgentFiles(response.files?.map(f => f.path) || ["App.tsx"]);

      if (response.files && response.files.length > 0) {
        const newFiles = { ...vfsFiles };
        response.files.forEach(f => {
          newFiles[f.path] = f.content;
        });
        setVfsFiles(newFiles);
      }

      setIsGenerating(false);
      setMessages(prev => [...prev, { role: "assistant", content: response.thought }]);
      setAgentLogs([]);
      toast.success("Synchronized");
    } catch (error: any) {
      setIsGenerating(false);
      toast.error("Generation Failed", { description: error.message });
    }
  };

  const handleSave = async () => {
    if (!user) return toast.error("Authentication required");
    const tid = toast.loading("Saving...");
    try {
      const isGuest = user.app_metadata?.isGuest || user.id === 'guest-user-000';
      if (isGuest) {
        localStorage.setItem(`ship_local_${projectId}`, JSON.stringify({ name: projectName, vfs: vfsFiles }));
        toast.success("Saved Local", { id: tid });
      } else {
        const { error } = await supabase.from("projects").update({ vfs_files: vfsFiles, name: projectName }).eq("id", projectId);
        if (error) throw error;
        toast.success("Saved Cloud", { id: tid });
      }
    } catch (e: any) {
      toast.error("Save Failed", { id: tid, description: e.message });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => navigate(`/export/${projectId || 'demo'}`), 800);
  };

  const onSettingsSave = async () => {
    setIsValidatingSettings(true);
    // Persist keys
    localStorage.setItem('shipkernel_openai_key', openaiKey);
    localStorage.setItem('shipkernel_gemini_key', geminiKey);
    localStorage.setItem('shipkernel_grok_key', grokKey);
    localStorage.setItem('shipkernel_active_provider', activeProvider);

    setIsValidatingSettings(false);
    setSettingsOpen(false);
    toast.success("Settings applied");
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-white overflow-hidden selection:bg-primary/30">
      <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />

      <BuilderToolbar
        projectName={projectName}
        projectId={projectId || ''}
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
      />

      <div className="flex-1 relative z-10 flex overflow-hidden">
        {isMobile ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mobile simplified tabs can stay here or be extracted if they get too complex */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeMobileTab === 'editor' && (
                <BuilderPreviewPanel
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  selectedFile={selectedFile}
                  mockCode={vfsFiles[selectedFile] || initialAppCode}
                  compiledCode={compiledCode}
                  isPreviewReady={isPreviewReady}
                  iframeRef={iframeRef}
                  hasVfs={Object.keys(vfsFiles).length > 0}
                />
              )}
            </div>
          </div>
        ) : (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={15} minSize={8} collapsible className="flex flex-col bg-[#080808]/40 border-r border-white/5">
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Files</span>
              </div>
              <BuilderFileTree
                fileTree={dynamicFileTree}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
              />
            </Panel>

            <ResizeHandle />

            <Panel defaultSize={65} minSize={30} className="flex flex-col bg-[#050505] overflow-hidden">
              <BuilderPreviewPanel
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedFile={selectedFile}
                mockCode={vfsFiles[selectedFile] || initialAppCode}
                compiledCode={compiledCode}
                isPreviewReady={isPreviewReady}
                iframeRef={iframeRef}
                hasVfs={Object.keys(vfsFiles).length > 0}
              />

              <BuilderTerminal
                terminalOpen={terminalOpen}
                setTerminalOpen={setTerminalOpen}
                terminalLogs={terminalLogs}
              />
            </Panel>

            {rightPanelOpen && (
              <>
                <ResizeHandle />
                <Panel defaultSize={20} minSize={15} collapsible onCollapse={() => setRightPanelOpen(false)}>
                  <BuilderChatPanel
                    messages={messages}
                    isGenerating={isGenerating}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                    handleSendMessage={handleSendMessage}
                  />
                  <AgentOverlay
                    isGenerating={isGenerating}
                    progress={genProgress}
                    thought={agentThought}
                    files={agentFiles}
                    logs={agentLogs}
                  />
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
        setActiveProvider={(p) => localStorage.setItem('shipkernel_active_provider', p)}
        openaiKey={openaiKey}
        setOpenaiKey={setOpenaiKey}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        grokKey={grokKey}
        setGrokKey={setGrokKey}
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
