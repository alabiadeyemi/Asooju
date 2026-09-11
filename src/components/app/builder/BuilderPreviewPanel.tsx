import React from "react";
import { Loader2, RefreshCw, AlertTriangle, Sparkles, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PreviewStatus = "booting" | "live" | "building" | "error";

interface BuilderPreviewPanelProps {
  viewMode: "code" | "preview";
  setViewMode: (mode: "code" | "preview") => void;
  selectedFile: string;
  fileContent: string;
  onCodeChange?: (value: string) => void;
  isPreviewReady: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  hasVfs?: boolean;
  hideModeToggle?: boolean;
  sandboxKey?: number;
  isGenerating?: boolean;
  progress?: number;
  buildingFiles?: string[];
  buildingLabel?: string;
  previewStatus?: PreviewStatus;
  previewError?: string;
  onRefresh?: () => void;
  onFixError?: () => void;
}

export const BuilderPreviewPanel: React.FC<BuilderPreviewPanelProps> = ({
  viewMode,
  setViewMode,
  selectedFile,
  fileContent,
  onCodeChange,
  isPreviewReady,
  iframeRef,
  hasVfs,
  hideModeToggle = false,
  sandboxKey = 0,
  isGenerating = false,
  progress = 0,
  buildingFiles = [],
  buildingLabel,
  previewStatus = "booting",
  previewError,
  onRefresh,
  onFixError,
}) => {
  const booting = !hasVfs || !isPreviewReady;
  const showBuildOverlay = isGenerating && viewMode === "preview";
  const showErrorChip = previewStatus === "error" && !!previewError && !isGenerating;

  const statusDot =
    previewStatus === "error"
      ? "bg-red-500"
      : isGenerating
        ? "bg-amber-400 animate-pulse"
        : previewStatus === "live"
          ? "bg-emerald-500"
          : "bg-white/30";

  const statusText = showBuildOverlay
    ? buildingLabel || "Building…"
    : previewStatus === "error"
      ? "Preview error"
      : previewStatus === "live"
        ? "Live preview"
        : "Starting…";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020202]">
      <div className="h-9 border-b border-white/[0.06] bg-[#0a0a0b] flex items-center justify-between px-3 shrink-0 relative z-20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot)} />
          <span className="text-[10px] font-mono tracking-tight text-white/45 truncate">
            {viewMode === "preview" ? statusText : selectedFile}
          </span>
          {showBuildOverlay && (
            <span className="text-[10px] font-mono text-amber-400/80 tabular-nums shrink-0">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {viewMode === "preview" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/35 hover:text-white"
              title="Refresh preview"
              onClick={onRefresh}
            >
              <RefreshCw className={cn("w-3 h-3", booting && "animate-spin")} />
            </Button>
          )}
          {!hideModeToggle && (
            <div className="flex items-center border border-white/[0.08] rounded-md p-0.5 bg-black/40">
              <button
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-all ${
                  viewMode === "preview"
                    ? "bg-white/10 text-white"
                    : "text-white/25 hover:text-white/45"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`px-2.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-all ${
                  viewMode === "code"
                    ? "bg-white/10 text-white"
                    : "text-white/25 hover:text-white/45"
                }`}
              >
                Code
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {viewMode === "code" ? (
          <div className="flex-1 overflow-hidden flex flex-col bg-[#020202]">
            <textarea
              value={fileContent}
              onChange={(e) => onCodeChange?.(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full resize-none bg-transparent p-4 text-[12.5px] font-mono leading-relaxed text-white/70 outline-none custom-scrollbar"
            />
          </div>
        ) : (
          <div className="flex-1 relative bg-[#050505] flex flex-col">
            {/* Always keep iframe mounted so we don't go blank */}
            <iframe
              key={sandboxKey}
              ref={iframeRef}
              className={cn(
                "absolute inset-0 w-full h-full border-0 bg-white transition-opacity duration-300",
                booting && !isGenerating ? "opacity-0" : "opacity-100"
              )}
              title="Preview"
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
              src={`/preview-sandbox.html?v=${sandboxKey}`}
            />

            {booting && !isGenerating && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505] gap-3 px-6 text-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
                  Loading preview
                </span>
                <p className="text-[11px] text-white/30 max-w-sm leading-relaxed">
                  Preview runs inside this app (same origin). If the page says “refused to connect”,
                  open the Vite URL on port <span className="text-white/50 font-mono">8080</span> —
                  not a stale 8081/8082 tab.
                </p>
                {onRefresh && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] rounded-lg border-white/15"
                    onClick={onRefresh}
                  >
                    Retry preview
                  </Button>
                )}
              </div>
            )}

            {/* Lovable-style live build chrome — preview stays visible underneath */}
            {showBuildOverlay && (
              <div className="absolute inset-x-0 top-0 z-30 pointer-events-none">
                <div className="m-3 rounded-xl border border-white/10 bg-[#0a0a0b]/85 backdrop-blur-md shadow-2xl pointer-events-auto overflow-hidden max-w-sm">
                  <div className="px-3 py-2.5 flex items-center gap-2 border-b border-white/[0.06]">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-white/85 truncate">
                        {buildingLabel || "Building your app"}
                      </div>
                      <div className="text-[10px] text-white/35 mt-0.5">
                        Preview updates as files land
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 tabular-nums">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  {buildingFiles.length > 0 && (
                    <div className="px-2 py-1.5 max-h-28 overflow-y-auto custom-scrollbar space-y-0.5">
                      {buildingFiles.slice(-6).map((f) => (
                        <div
                          key={f}
                          className="flex items-center gap-1.5 px-1.5 py-1 text-[10px] font-mono text-white/55"
                        >
                          <FileCode className="w-3 h-3 text-primary/70 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="h-0.5 bg-white/[0.05]">
                    <div
                      className="h-full bg-primary/80 transition-all duration-300"
                      style={{ width: `${Math.max(progress, 4)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {showErrorChip && (
              <div className="absolute inset-x-0 bottom-0 z-30 p-3 pointer-events-none">
                <div className="rounded-xl border border-red-500/30 bg-[#1a0a0a]/95 backdrop-blur-md p-3 pointer-events-auto max-w-lg shadow-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-red-200">Preview error</div>
                      <div className="text-[11px] text-red-200/70 mt-1 break-words line-clamp-3">
                        {previewError}
                      </div>
                      <div className="flex gap-2 mt-2.5">
                        {onFixError && (
                          <Button
                            size="sm"
                            className="h-7 text-[10px] rounded-lg bg-white text-black hover:bg-white/90"
                            onClick={onFixError}
                          >
                            Fix with AI
                          </Button>
                        )}
                        {onRefresh && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] rounded-lg border-white/15"
                            onClick={onRefresh}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
