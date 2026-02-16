import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Menu,
    Save,
    Share2,
    Settings,
    Rocket,
    RefreshCcw,
    PanelRightOpen,
    PanelRightClose
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

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
}) => {
    return (
        <header className="h-14 border-b border-white/5 bg-[#0A0A0B] flex items-center justify-between px-4 md:px-6 shrink-0 relative z-50">
            <div className="flex items-center gap-3 md:gap-6">
                {isMobile && (
                    <button onClick={() => setMobileExplorerOpen(!mobileExplorerOpen)} className="p-2 text-muted-foreground hover:text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-2">
                        <Logo size="sm" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[11px] md:text-[12px] font-black uppercase tracking-widest text-white leading-none">{projectName}</span>
                        <span className="text-[9px] text-white/30 hidden sm:block mt-0.5">main branch • {projectId === 'demo-project' ? 'local only' : 'synced to cloud'}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8 text-muted-foreground hover:text-white">
                    <Save className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 text-muted-foreground hover:text-white">
                    <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSettings} className="h-8 w-8 text-muted-foreground hover:text-white">
                    <Settings className="w-4 h-4" />
                </Button>
                <div className="w-px h-6 bg-white/5 mx-1" />
                <Button
                    variant="hero"
                    size="sm"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="rounded-full bg-white text-black hover:bg-white/90 text-[10px] md:text-[11px] font-bold uppercase tracking-widest px-4 md:px-5 h-7 md:h-8 shrink-0"
                >
                    {isPublishing ? (
                        <RefreshCcw className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                        <Rocket className="w-3 h-3 mr-1.5 md:mr-2" />
                    )}
                    {isPublishing ? "Syncing..." : "Publish"}
                </Button>
                {!isMobile && (
                    <>
                        <div className="w-px h-6 bg-white/5 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setRightPanelOpen(!rightPanelOpen)}>
                            {rightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                        </Button>
                    </>
                )}
            </div>
        </header>
    );
};
