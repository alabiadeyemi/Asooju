import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send, Download, GitBranch, Rocket, ChevronRight, ChevronDown,
  File, Folder, PanelRightOpen, PanelRightClose,
} from "lucide-react";

// Mock file tree
const fileTree = [
  {
    name: "src",
    type: "folder" as const,
    children: [
      { name: "App.tsx", type: "file" as const },
      { name: "main.tsx", type: "file" as const },
      { name: "index.css", type: "file" as const },
      {
        name: "components",
        type: "folder" as const,
        children: [
          { name: "Navbar.tsx", type: "file" as const },
          { name: "Dashboard.tsx", type: "file" as const },
          { name: "UserCard.tsx", type: "file" as const },
        ],
      },
      {
        name: "pages",
        type: "folder" as const,
        children: [
          { name: "Home.tsx", type: "file" as const },
          { name: "Settings.tsx", type: "file" as const },
        ],
      },
    ],
  },
  { name: "package.json", type: "file" as const },
  { name: "tsconfig.json", type: "file" as const },
];

type TreeNode = { name: string; type: "file" | "folder"; children?: TreeNode[] };

const FileTreeItem = ({
  node,
  depth = 0,
  selectedFile,
  onSelect,
}: {
  node: TreeNode;
  depth?: number;
  selectedFile: string;
  onSelect: (name: string) => void;
}) => {
  const [open, setOpen] = useState(true);
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        onClick={() => (isFolder ? setOpen(!open) : onSelect(node.name))}
        className={`w-full flex items-center gap-1.5 py-1 px-2 text-xs rounded transition-colors ${
          selectedFile === node.name
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <File className="h-3 w-3 shrink-0" />
        )}
        {isFolder && <Folder className="h-3 w-3 shrink-0" />}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeItem key={child.name} node={child} depth={depth + 1} selectedFile={selectedFile} onSelect={onSelect} />
      ))}
    </div>
  );
};

const mockCode = `import React from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;`;

const mockMessages = [
  { role: "user" as const, content: "Create a SaaS dashboard with a navbar and user cards" },
  {
    role: "assistant" as const,
    content:
      "I've created a SaaS dashboard with:\n\n• **Navbar** with logo and navigation links\n• **Dashboard** with stat cards and a user list\n• **UserCard** component with avatar and role badge\n\nThe app uses Tailwind CSS and is fully responsive. You can see the generated files in the file tree.",
  },
];

const ProjectBuilder = () => {
  const [chatInput, setChatInput] = useState("");
  const [selectedFile, setSelectedFile] = useState("App.tsx");
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-foreground">my-saas-app</span>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">GPT</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Download className="h-3.5 w-3.5 mr-1" />
            ZIP
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <GitBranch className="h-3.5 w-3.5 mr-1" />
            GitHub
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Rocket className="h-3.5 w-3.5 mr-1" />
            Deploy
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setChatOpen(!chatOpen)}
          >
            {chatOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="hidden md:block w-56 border-r border-border bg-card overflow-y-auto py-2 shrink-0">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</div>
          {fileTree.map((node) => (
            <FileTreeItem key={node.name} node={node} selectedFile={selectedFile} onSelect={setSelectedFile} />
          ))}
        </div>

        {/* Code editor */}
        <div className="flex-1 overflow-auto bg-background">
          <div className="flex items-center h-9 px-4 border-b border-border bg-card text-xs">
            <span className="text-muted-foreground">src /</span>
            <span className="text-foreground ml-1">{selectedFile}</span>
          </div>
          <pre className="p-4 text-sm font-mono text-muted-foreground leading-relaxed overflow-auto">
            <code>{mockCode}</code>
          </pre>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-full md:w-80 lg:w-96 border-l border-border bg-card flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-border text-sm font-medium text-foreground">Chat</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mockMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Describe what to build..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="text-sm"
                />
                <Button variant="hero" size="icon" className="shrink-0 h-9 w-9">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBuilder;
