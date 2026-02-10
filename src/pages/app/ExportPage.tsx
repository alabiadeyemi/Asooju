import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, GitBranch, Rocket, Copy, Check } from "lucide-react";
import { useState } from "react";

const ExportPage = () => {
  const { projectId } = useParams();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">Export project</h1>
      <p className="text-sm text-muted-foreground mb-8">Choose how to export your project.</p>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Download ZIP</h3>
              <p className="text-xs text-muted-foreground">Get the full project as a zip archive</p>
            </div>
          </div>
          <Button variant="hero" size="sm">Download ZIP</Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Push to GitHub</h3>
              <p className="text-xs text-muted-foreground">Create a new repo or push to existing</p>
            </div>
          </div>
          <Button variant="hero-outline" size="sm">Connect GitHub</Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Deploy to Vercel</h3>
              <p className="text-xs text-muted-foreground">One-click deploy button</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? "Copied!" : "Copy deploy link"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
