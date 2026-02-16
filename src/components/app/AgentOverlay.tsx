import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { CloudLightning, Terminal, FileCode, Sparkles, Brain } from "lucide-react";

interface AgentOverlayProps {
    isGenerating: boolean;
    progress: number;
    thought: string;
    files: string[];
    logs: string[];
}

export const AgentOverlay: React.FC<AgentOverlayProps> = ({
    isGenerating,
    progress,
    thought,
    files,
    logs
}) => {
    return (
        <AnimatePresence>
            {isGenerating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] bg-[#020202]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-white"
                >
                    {/* Main Visual */}
                    <div className="relative mb-12 flex flex-col items-center">
                        <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse rounded-full" />
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 border border-primary/10 rounded-full scale-150"
                        />
                        <div className="relative w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.15)] mt-4">
                            <CloudLightning className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <div className="mt-6 flex flex-col items-center gap-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Engine Sequence Active</div>
                            <div className="text-xs text-white/40 font-mono tracking-tighter">v2.5.0-agentic-os</div>
                        </div>
                    </div>

                    <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8 h-[300px]">
                        {/* Left: Reasoning & Brain */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                <Brain className="w-3 h-3 text-primary" />
                                Neural Log
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/5 rounded-2xl p-4 overflow-y-auto custom-scrollbar relative group">
                                <div className="absolute top-4 right-4 animate-pulse">
                                    <Sparkles className="w-3 h-3 text-primary/40" />
                                </div>
                                <p className="text-[12px] leading-relaxed text-white/70 font-medium italic">
                                    {thought || "Initializing cognitive engines and analyzing project constraints to determine optimal architectural pattern..."}
                                </p>
                            </div>
                        </div>

                        {/* Right: Operations & Files */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                <Terminal className="w-3 h-3 text-primary" />
                                System Operations
                            </div>
                            <div className="flex-1 bg-[#0A0A0B] border border-white/5 rounded-2xl p-4 font-mono text-[9px] overflow-hidden flex flex-col gap-2">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {(files.length > 0 ? files : ['Analyzing...']).map((file, i) => (
                                        <motion.div
                                            key={file + i}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-md flex items-center gap-1"
                                        >
                                            <FileCode className="w-2.5 h-2.5" />
                                            {file}
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex-1 space-y-1 opacity-40">
                                    {logs.slice(-6).map((log, i) => (
                                        <div key={i} className="flex gap-2 truncate">
                                            <span className="text-primary/40">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                            <span>{log}</span>
                                        </div>
                                    ))}
                                    <div className="animate-pulse flex gap-2 text-primary font-bold">
                                        <span>&gt;</span>
                                        <div className="w-1.5 h-3 bg-primary" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Progress */}
                    <div className="w-full max-w-2xl mt-8">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Synchronizing Stream</span>
                            <span className="text-[10px] font-mono text-primary">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-gradient-to-r from-primary to-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
