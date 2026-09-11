import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home, Terminal, ShieldAlert } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/30 font-sans">
                    {/* Background Ambience */}
                    <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 blur-[150px] pointer-events-none" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl w-full text-center relative z-10"
                    >
                        <div className="w-24 h-24 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                            <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6 leading-none italic text-red-500">
                            Critical <br /> <span className="text-white not-italic">Failure</span>
                        </h1>

                        <p className="text-muted-foreground/60 text-lg mb-12 font-medium leading-relaxed">
                            We encountered an unhandled exception in the project core. Our automated systems have logged the event.
                        </p>

                        <div className="bg-[#0A0A0B] border border-white/5 rounded-3xl p-6 mb-12 text-left overflow-hidden group max-w-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Terminal className="w-3.5 h-3.5 text-red-500/50 shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Error details</span>
                            </div>
                            <div className="font-mono text-[11px] text-red-400/80 bg-black/40 rounded-xl p-4 overflow-auto max-h-48 custom-scrollbar break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
                                {this.state.error?.toString()}
                                {"\n"}
                                {this.state.error?.stack?.split("\n").slice(1, 6).join("\n")}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button
                                variant="hero"
                                className="h-14 px-10 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 group"
                                onClick={() => window.location.reload()}
                            >
                                <RefreshCcw className="w-4 h-4 mr-2 group-active:rotate-180 transition-transform duration-500" />
                                Reload Project
                            </Button>
                            <Button
                                variant="outline"
                                className="h-14 px-10 rounded-2xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[11px]"
                                onClick={() => window.location.href = '/'}
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Safe Exit
                            </Button>
                        </div>
                    </motion.div>

                    <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-20">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Red Alert Protocol Active</span>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
