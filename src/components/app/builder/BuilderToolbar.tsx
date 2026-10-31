import React from "react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Save,
  Share2,
  Settings,
  Rocket,
  RefreshCcw,
  PanelRightOpen,
  PanelRightClose,
  Files,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

interface BuilderToolbarProps {
  projectName: string;
  projectId: string;
  isMobile: boolean;
  mobileExplorerOpen: boolean;
  setMobileExplorerOpen: (open: boolean) => void;
  handleSave: () => void;
  handleShare: () => void;
  handleSettings: () => void;
  handlePublish: () => void;
  isPublishing: boolean;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  viewMode: "code" | "preview";
  setViewMode: (mode: "code" | "preview") => void;
  filesPanelOpen: boolean;
  setFilesPanelOpen: (open: boolean) => void;
}

export const BuilderToolbar: React.FC<BuilderToolbarProps> = ({
  projectName,
  projectId,
  isMobile,
  mobileExplorerOpen,
  setMobileExplorerOpen,
  handleSave,
  handleShare,
  handleSettings,
  handlePublish,
  isPublishing,
  rightPanelOpen,
  setRightPanelOpen,
  viewMode,
  setViewMode,
  filesPanelOpen,
  setFilesPanelOpen,
}) => {
  return (
    <header className="relative z-40 flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0b] px-3 max-lg:pl-14">
      <div className="flex min-w-0 items-center gap-2.5">
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileExplorerOpen(!mobileExplorerOpen)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-white"
            aria-label={mobileExplorerOpen ? "Close files" : "Open files"}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <Logo size="sm" />
        <div className="flex flex-col text-left min-w-0">
          <span className="text-[12px] font-semibold text-white leading-none truncate">
            {projectName}
          </span>
          <span className="text-[9px] text-white/30 hidden sm:block mt-0.5 truncate">
            {projectId === "demo-project" ? "local" : "cloud"} · main
          </span>
        </div>

        {!isMobile && (
          <>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <div className="flex items-center rounded-md border border-white/[0.08] p-0.5 bg-black/30">
              <button
                onClick={() => setViewMode("preview")}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  viewMode === "preview"
                    ? "bg-white/10 text-white"
                    : "text-white/35 hover:text-white/60"
                )}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  viewMode === "code"
                    ? "bg-white/10 text-white"
                    : "text-white/35 hover:text-white/60"
                )}
              >
                Code
              </button>
            </div>
            {viewMode === "code" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilesPanelOpen(!filesPanelOpen)}
                className={cn(
                  "h-7 gap-1.5 px-2 text-[10px] uppercase tracking-wider",
                  filesPanelOpen ? "text-white/70" : "text-white/35"
                )}
              >
                <Files className="w-3.5 h-3.5" />
                Files
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="h-7 w-7 text-muted-foreground hover:text-white"
          title="Save"
        >
          <Save className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="h-7 w-7 text-muted-foreground hover:text-white"
          title="Share"
        >
          <Share2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSettings}
          className="h-7 w-7 text-muted-foreground hover:text-white"
          title="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <Button
          size="sm"
          onClick={handlePublish}
          disabled={isPublishing}
          className="rounded-md bg-white text-black hover:bg-white/90 text-[10px] font-semibold uppercase tracking-wider px-3 h-7"
        >
          {isPublishing ? (
            <RefreshCcw className="w-3 h-3 animate-spin mr-1.5" />
          ) : (
            <Rocket className="w-3 h-3 mr-1.5" />
          )}
          {isPublishing ? "…" : "Publish"}
        </Button>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground ml-0.5"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title={rightPanelOpen ? "Hide agent" : "Show agent"}
          >
            {rightPanelOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
};
