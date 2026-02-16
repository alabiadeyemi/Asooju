import React, { useState } from 'react';
import {
    FolderIcon,
    ChevronRight,
    ChevronDown,
    FileCode,
    FileJson,
    Code2
} from "lucide-react";

export interface TreeNode {
    name: string;
    type: "file" | "folder";
    children?: TreeNode[];
}

interface FileTreeItemProps {
    node: TreeNode;
    depth?: number;
    selectedFile: string;
    onSelect: (name: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
    node,
    depth = 0,
    selectedFile,
    onSelect,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const isSelected = selectedFile === node.name;

    if (node.type === "folder") {
        return (
            <div className="flex flex-col">
                <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="group flex items-center gap-2 px-4 py-1.5 hover:bg-white/5 cursor-pointer transition-all border-l-2 border-transparent"
                    style={{ paddingLeft: `${depth * 12 + 16}px` }}
                >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                    <FolderIcon className={`w-3.5 h-3.5 ${isOpen ? 'text-primary' : 'text-primary/60'}`} />
                    <span className="text-[11px] font-bold text-white/50 group-hover:text-white/80 transition-colors uppercase tracking-wider">{node.name}</span>
                </div>
                {isOpen && node.children?.map((child) => (
                    <FileTreeItem key={child.name} node={child} depth={depth + 1} selectedFile={selectedFile} onSelect={onSelect} />
                ))}
            </div>
        );
    }

    const getFileIcon = (name: string) => {
        if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-orange-400/80" />;
        if (name.endsWith('.css')) return <Code2 className="w-3.5 h-3.5 text-blue-400/80" />;
        return <FileCode className="w-3.5 h-3.5 text-primary/80" />;
    };

    return (
        <div
            onClick={() => onSelect(node.name)}
            className={`group flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-all border-l-2 ${isSelected ? 'bg-primary/10 border-primary text-white shadow-[inset_4px_0_12px_rgba(34,197,94,0.1)]' : 'border-transparent text-white/40 hover:bg-white/5 hover:text-white/70'
                }`}
            style={{ paddingLeft: `${depth * 12 + 16}px` }}
        >
            <div className="flex items-center gap-2.5">
                {getFileIcon(node.name)}
                <span className="text-[11px] font-mono tracking-tight">{node.name}</span>
            </div>
        </div>
    );
};

interface BuilderFileTreeProps {
    fileTree: TreeNode[];
    selectedFile: string;
    setSelectedFile: (file: string) => void;
}

export const BuilderFileTree: React.FC<BuilderFileTreeProps> = ({
    fileTree,
    selectedFile,
    setSelectedFile
}) => {
    return (
        <div className="flex-1 overflow-y-auto py-2">
            {fileTree.map((node) => (
                <FileTreeItem
                    key={node.name}
                    node={node}
                    selectedFile={selectedFile}
                    onSelect={setSelectedFile}
                />
            ))}
        </div>
    );
};
