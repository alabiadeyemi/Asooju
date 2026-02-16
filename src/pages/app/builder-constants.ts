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

export const mockCode = `import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dashboard } from './components/Dashboard';

/**
 * AI Assistant Workspace
 * Professional, Clean, & Fast
 */
function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 p-6 md:p-12">
        <h1 className="text-4xl font-bold">Welcome</h1>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;`;

export const chatMessages = [
    { role: "assistant" as const, content: "I've fixed the layout issues! The logs now stay at the bottom where they belong, and the workspace area handles both code and preview perfectly side-by-side with them. Try toggling the logs now!" },
];
