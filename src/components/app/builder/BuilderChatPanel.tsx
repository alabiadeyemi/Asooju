import React from 'react';
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
    role: "assistant" | "user";
    content: string;
}

interface BuilderChatPanelProps {
    messages: Message[];
    isGenerating: boolean;
    chatInput: string;
    setChatInput: (input: string) => void;
    handleSendMessage: (customPrompt?: string) => void;
}

export const BuilderChatPanel: React.FC<BuilderChatPanelProps> = ({
    messages,
    isGenerating,
    chatInput,
    setChatInput,
    handleSendMessage
}) => {
    return (
        <aside className="h-full bg-[#080808]/80 backdrop-blur-3xl flex flex-col overflow-hidden">
            <div className="h-14 border-b border-white/5 bg-[#0A0A0B] px-6 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Assistant</span>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-10">
                <div className="space-y-6">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-[24px] px-5 py-4 text-[12px] leading-relaxed shadow-xl ${m.role === 'user'
                                ? 'bg-primary/10 border border-primary/20 text-white animate-in slide-in-from-right-4'
                                : 'bg-[#0A0A0B] border border-white/5 text-muted-foreground animate-in slide-in-from-left-4'
                                }`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isGenerating && (
                        <div className="flex items-start gap-3 text-primary animate-pulse ml-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Generating...</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-[#060606] shrink-0">
                <div className="relative group">
                    <Input
                        placeholder="Message AI..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isGenerating}
                        className="h-12 bg-white/5 border-white/10 rounded-2xl pl-4 pr-12 text-[12px] focus:ring-primary/20 disabled:opacity-50"
                    />
                    <Button
                        variant="hero"
                        size="icon"
                        onClick={() => handleSendMessage()}
                        disabled={isGenerating || !chatInput.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl active:scale-95 transition-all"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </aside>
    );
};
