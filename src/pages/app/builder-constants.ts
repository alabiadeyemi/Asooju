export interface TreeNode {
  name: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

export const fileTree: TreeNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      { name: "App.tsx", type: "file" },
      { name: "main.tsx", type: "file" },
      { name: "index.css", type: "file" },
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Navbar.tsx", type: "file" },
          { name: "Dashboard.tsx", type: "file" },
          { name: "UserCard.tsx", type: "file" },
        ],
      },
    ],
  },
  { name: "package.json", type: "file" },
];

export const mockCode = `import React from "react";
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';

/**
 * AI Assistant Workspace
 * Professional, Clean, & Fast
 */
function App() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Navbar />
      <main className="flex-1 p-6 md:p-12">
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter mb-4">
            Neural Link <span className="text-primary">Active</span>
          </h1>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed">
            Welcome to your new modular workspace. This project is built using a Virtual Filesystem architecture, allowing for clean, multi-file development.
          </p>
        </header>
        
        <Dashboard />
      </main>
    </div>
  );
}

export default App;`;

export const chatMessages = [
  { role: "assistant" as const, content: "I've fixed the layout issues! The logs now stay at the bottom where they belong, and the workspace area handles both code and preview perfectly side-by-side with them. Try toggling the logs now!" },
];
