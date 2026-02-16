import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuilderTerminalProps {
    terminalOpen: boolean;
    setTerminalOpen: (open: boolean) => void;
    terminalLogs: { id: string; time: string; level: 'info' | 'error' | 'success' | 'agent'; message: string }[];
}

export const BuilderTerminal: React.FC<BuilderTerminalProps> = ({
    terminalOpen,
    setTerminalOpen,
    terminalLogs
}) => {
    return (
        <>
            <AnimatePresence>
                {terminalOpen && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 180 }}
                        exit={{ height: 0 }}
                        className="border-t border-white/5 bg-[#080808] flex flex-col shrink-0 z-30"
                    >
                        <div
                            className="h-9 border-b border-white/5 bg-[#0A0A0B] px-4 flex items-center justify-between shrink-0 cursor-pointer"
                            onClick={() => setTerminalOpen(false)}
                        >
                            <div className="flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">System Output</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar space-y-1">
                            {terminalLogs.map((log) => (
                                <div key={log.id} className="flex gap-2">
                                    <span className="text-white/20 whitespace-nowrap">[{log.time}]</span>
                                    <span className={cn(
                                        "font-bold uppercase tracking-tighter w-14 shrink-0",
                                        log.level === 'error' ? 'text-red-500' :
                                            log.level === 'success' ? 'text-primary' :
                                                log.level === 'agent' ? 'text-purple-500' : 'text-blue-400'
                                    )}>
                                        {log.level}:
                                    </span>
                                    <span className={cn(
                                        "break-all",
                                        log.level === 'error' ? 'text-red-400/80' : 'text-muted-foreground/80'
                                    )}>
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            <div className="flex gap-2 text-white/10 pt-1">
                                <span>&gt;</span>
                                <span className="animate-pulse w-1.5 h-3 bg-primary/20" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!terminalOpen && (
                <button
                    onClick={() => setTerminalOpen(true)}
                    className="h-6 border-t border-white/5 bg-[#0A0A0B] flex items-center justify-center hover:bg-white/5 transition-colors shrink-0 z-30"
                >
                    <ChevronDown className="w-4 h-4 rotate-180 text-muted-foreground/30 hover:text-primary transition-all" />
                </button>
            )}
        </>
    );
};
