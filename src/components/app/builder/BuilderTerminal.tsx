import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BuilderTerminalProps {
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  terminalLogs: {
    id: string;
    time: string;
    level: "info" | "error" | "success" | "agent";
    message: string;
  }[];
}

export const BuilderTerminal: React.FC<BuilderTerminalProps> = ({
  terminalOpen,
  setTerminalOpen,
  terminalLogs,
}) => {
  return (
    <>
      <AnimatePresence>
        {terminalOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 140 }}
            exit={{ height: 0 }}
            className="border-t border-white/5 bg-[#080808] flex flex-col shrink-0 z-30 overflow-hidden min-h-0"
          >
            <div
              className="h-9 border-b border-white/5 bg-[#0A0A0B] px-4 flex items-center justify-between shrink-0 cursor-pointer"
              onClick={() => setTerminalOpen(false)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest truncate">
                  System Output
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            <div className="flex-1 min-h-0 p-3 font-mono text-[11px] overflow-y-auto overflow-x-hidden custom-scrollbar space-y-1.5">
              {terminalLogs.map((log) => (
                <div key={log.id} className="flex gap-2 items-start min-w-0 w-full">
                  <span className="text-white/20 whitespace-nowrap shrink-0">[{log.time}]</span>
                  <span
                    className={cn(
                      "font-bold uppercase tracking-tighter w-12 shrink-0",
                      log.level === "error"
                        ? "text-red-500"
                        : log.level === "success"
                          ? "text-primary"
                          : log.level === "agent"
                            ? "text-purple-400"
                            : "text-blue-400"
                    )}
                  >
                    {log.level}
                  </span>
                  <span
                    title={log.message}
                    className={cn(
                      "min-w-0 flex-1 break-words [overflow-wrap:anywhere]",
                      log.level === "error" ? "text-red-400/90" : "text-muted-foreground/80"
                    )}
                  >
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
          className="h-7 border-t border-white/[0.06] bg-[#0a0a0b] flex items-center gap-2 px-3 hover:bg-white/[0.03] transition-colors shrink-0 z-30"
        >
          <Terminal className="w-3 h-3 text-white/25" />
          <span className="text-[9px] uppercase tracking-wider text-white/30 font-medium">Console</span>
          <ChevronDown className="w-3.5 h-3.5 rotate-180 text-white/20 ml-auto" />
        </button>
      )}
    </>
  );
};
