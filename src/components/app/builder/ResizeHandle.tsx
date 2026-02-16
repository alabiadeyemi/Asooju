import React from 'react';
import { PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
    className?: string;
    direction?: 'horizontal' | 'vertical';
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
    className,
    direction = 'horizontal'
}) => {
    return (
        <PanelResizeHandle
            className={cn(
                "relative flex items-center justify-center bg-white/5 hover:bg-primary/20 transition-colors group",
                direction === 'horizontal' ? "w-[1px] h-full cursor-col-resize" : "h-[1px] w-full cursor-row-resize",
                className
            )}
        >
            <div className={cn(
                "bg-white/10 group-hover:bg-primary/40 transition-colors rounded-full",
                direction === 'horizontal' ? "w-[1px] h-8" : "h-[1px] w-8"
            )} />
        </PanelResizeHandle>
    );
};
