import React, { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Inner = lazy(() => import("./BuilderSandpackInner"));

type Props = {
  vfs: Record<string, string>;
  projectName: string;
  onSandpackVerify?: (outcome: "live" | "error", message?: string) => void;
};

export const BuilderSandpackPreview: React.FC<Props> = ({
  vfs,
  projectName,
  onSandpackVerify,
}) => {
  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] gap-2">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="text-[10px] uppercase tracking-widest text-white/35">
            Loading preview
          </span>
        </div>
      }
    >
      <div className="absolute inset-0 [&_.sp-layout]:!h-full [&_.sp-wrapper]:!h-full">
        <Inner vfs={vfs} projectName={projectName} onSandpackVerify={onSandpackVerify} />
      </div>
    </Suspense>
  );
};
