import React from 'react';
import { Loader2 } from "lucide-react";

interface BuilderPreviewPanelProps {
    viewMode: 'code' | 'preview';
    setViewMode: (mode: 'code' | 'preview') => void;
    selectedFile: string;
    mockCode: string;
    compiledCode: { code: string; componentName: string };
    isPreviewReady: boolean;
    iframeRef: React.RefObject<HTMLIFrameElement>;
    hasVfs?: boolean;
}

export const BuilderPreviewPanel: React.FC<BuilderPreviewPanelProps> = ({
    viewMode,
    setViewMode,
    selectedFile,
    mockCode,
    compiledCode,
    isPreviewReady,
    iframeRef,
    hasVfs
}) => {
    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#020202]">
            {/* Panel Header */}
            <div className="h-10 border-b border-white/5 bg-[#0A0A0B] flex items-center justify-between px-4 shrink-0 relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    <span className="text-[10px] font-mono tracking-tighter text-white/40">{selectedFile}</span>
                </div>
                <div className="flex items-center border border-white/5 rounded-full p-0.5 bg-black/40 shadow-inner">
                    <button
                        onClick={() => setViewMode('code')}
                        className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'code' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                    >
                        Code
                    </button>
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                    >
                        Preview
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {viewMode === 'code' ? (
                    <div className="flex-1 overflow-auto custom-scrollbar bg-[#020202] p-6">
                        <pre className="text-[13px] font-mono leading-relaxed selection:bg-primary/30">
                            <code className="text-muted-foreground/80 block whitespace-pre">
                                {mockCode}
                            </code>
                        </pre>
                    </div>
                ) : (
                    <div className="flex-1 relative bg-[#050505] flex flex-col group">
                        {/* Loading Overlay */}
                        {((!hasVfs && !compiledCode.code) || !isPreviewReady) && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505] gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                    <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
                                </div>
                                <div className="flex flex-col items-center gap-1 relative z-10">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">Initializing Preview</span>
                                    <div className="w-32 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary animate-[shimmer_2s_infinite]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Preview Render Area */}
                        <div className={`flex-1 flex flex-col transition-all duration-700 ${((!hasVfs && !compiledCode.code) || !isPreviewReady) ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
                            <iframe
                                ref={iframeRef}
                                className="flex-1 w-full border-0 bg-white"
                                title="Preview"
                                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                                src="/preview-sandbox.html"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
