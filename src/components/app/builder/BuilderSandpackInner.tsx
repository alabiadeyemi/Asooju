import { useEffect, useMemo, useRef } from "react";
import { SandpackPreview, SandpackProvider, useSandpack } from "@codesandbox/sandpack-react";
import { sandpackRuntimeDependencies, vfsToSandpackFiles } from "@/lib/sandpack-vfs";

type Props = {
  vfs: Record<string, string>;
  projectName: string;
  onSandpackVerify?: (outcome: "live" | "error", message?: string) => void;
};

function SandpackVerifyBridge({
  onSandpackVerify,
}: {
  onSandpackVerify?: (outcome: "live" | "error", message?: string) => void;
}) {
  const { listen } = useSandpack();
  const onRef = useRef(onSandpackVerify);
  onRef.current = onSandpackVerify;

  useEffect(() => {
    if (!onRef.current) return;
    const unsub = listen((msg) => {
      const cb = onRef.current;
      if (!cb) return;
      if (msg.type === "done") {
        const err = (msg as { compilatonError?: boolean }).compilatonError;
        if (err) cb("error", "Bundler reported a compile error");
        else cb("live");
        return;
      }
      if (msg.type === "action" && (msg as { action?: string }).action === "show-error") {
        const m = msg as { message?: string; title?: string; path?: string };
        const text = [m.title, m.path, m.message].filter(Boolean).join(" — ");
        cb("error", text || "Bundler error");
      }
    });
    return unsub;
  }, [listen]);

  return null;
}

export default function BuilderSandpackInner({ vfs, projectName, onSandpackVerify }: Props) {
  const files = useMemo(() => vfsToSandpackFiles(vfs, projectName), [vfs, projectName]);
  const customSetup = useMemo(
    () => ({ dependencies: sandpackRuntimeDependencies(vfs) }),
    [vfs]
  );

  return (
    <SandpackProvider
      template="vite-react-ts"
      files={files}
      customSetup={customSetup}
      theme="dark"
      options={{
        showNavigator: false,
        showTabs: false,
        showLineNumbers: false,
        editorHeight: 0,
      }}
    >
      <SandpackVerifyBridge onSandpackVerify={onSandpackVerify} />
      <div className="h-full w-full min-h-0 [&_.sp-preview]:!h-full [&_.sp-preview-container]:!h-full [&_.sp-layout]:!border-0 [&_.sp-layout]:!rounded-none [&_.sp-layout]:!bg-[#050505]">
        <SandpackPreview showNavigator={false} showRefreshButton={false} />
      </div>
    </SandpackProvider>
  );
}
