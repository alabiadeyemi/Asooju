import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";

const getActiveProvider = () => {
    return (typeof window !== 'undefined' ? localStorage.getItem('shipkernel_active_provider') : "openai") || "openai";
};

const getApiKey = (provider: string) => {
    if (typeof window === 'undefined') return "";

    const keysJson = localStorage.getItem('shipkernel_keys');
    if (keysJson) {
        try {
            const keys = JSON.parse(keysJson);
            const target = provider === "auto" ? "openai" : provider;
            const match = keys.find((k: any) =>
                k.provider?.toLowerCase() === target.toLowerCase() && k.value
            );
            if (match) return match.value.trim().replace(/[^\x20-\x7F]/g, "");
        } catch (e) {
            console.error("Failed to parse keys:", e);
        }
    }

    // Fallbacks
    if (provider === "openai" || provider === "auto") {
        const stored = localStorage.getItem('shipkernel_openai_key') || import.meta.env.VITE_OPENAI_API_KEY || "";
        return stored.trim().replace(/[^\x20-\x7F]/g, "");
    }

    if (provider === "gemini") {
        const stored = localStorage.getItem('shipkernel_gemini_key') || import.meta.env.VITE_GEMINI_API_KEY || "";
        return stored.trim().replace(/[^\x20-\x7F]/g, "");
    }

    if (provider === "grok") {
        const stored = localStorage.getItem('shipkernel_grok_key') || import.meta.env.VITE_GROK_API_KEY || "";
        return stored.trim().replace(/[^\x20-\x7F]/g, "");
    }

    return "";
};

const getClient = () => {
    const activeProvider = getActiveProvider();
    const apiKey = getApiKey(activeProvider);
    let baseURL = "https://api.openai.com/v1";

    if (activeProvider === "grok") baseURL = "https://api.x.ai/v1";

    return new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
        dangerouslyAllowBrowser: true
    });
};

export interface GenerationAction {
    type: 'edit_file' | 'apply_sql' | 'npm_install';
    path?: string;
    content?: string;
    sql?: string;
    package?: string;
}

export interface GenerationFile {
    path: string;
    content: string;
}

export interface GenerationResponse {
    thought: string;
    plan: string[];
    actions?: GenerationAction[];
    files: GenerationFile[];
}

export const validateOpenAIKey = async (key: string) => {
    try {
        const tempClient = new OpenAI({
            apiKey: key.trim().replace(/[^\x00-\x7F]/g, ""),
            dangerouslyAllowBrowser: true
        });

        await tempClient.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 1
        });

        return { success: true };
    } catch (error: any) {
        console.error("Key Validation Error:", error);
        if (error.status === 401) return { success: false, error: "Invalid API Key." };
        if (error.status === 429) return { success: false, error: "Quota Exceeded: Please check your billing dashboard." };
        return { success: false, error: error.message || "Failed to verify key." };
    }
};

export const validateGrokKey = async (key: string) => {
    try {
        const tempClient = new OpenAI({
            apiKey: key.trim().replace(/[^\x00-\x7F]/g, ""),
            baseURL: "https://api.x.ai/v1",
            dangerouslyAllowBrowser: true
        });

        await tempClient.chat.completions.create({
            model: "grok-beta",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 1
        });

        return { success: true };
    } catch (error: any) {
        console.error("Grok Validation Error:", error);
        if (error.status === 401) return { success: false, error: "Invalid Grok Key." };
        if (error.status === 403) return { success: false, error: "No Credits: Your xAI account has $0 balance." };
        return { success: false, error: error.message || "Failed to verify Grok key." };
    }
};

export const validateGeminiKey = async (key: string) => {
    const attempts = [
        { version: "v1beta", model: "gemini-2.5-flash" },
        { version: "v1beta", model: "gemini-2.0-flash" },
        { version: "v1beta", model: "gemini-3-flash-preview" },
        { version: "v1beta", model: "gemini-flash-latest" },
        { version: "v1beta", model: "models/gemini-2.5-flash" },
        { version: "v1", model: "gemini-2.0-flash" }
    ];

    let lastError = null;
    const cleanKey = key.trim().replace(/[^\x00-\x7F]/g, "");

    for (const attempt of attempts) {
        try {
            const genAI = new GoogleGenerativeAI(cleanKey);
            const model = genAI.getGenerativeModel({ model: attempt.model }, { apiVersion: attempt.version });
            await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] });
            return { success: true, activeModel: attempt.model, activeVersion: attempt.version };
        } catch (error: any) {
            lastError = error;
            if (error.message?.includes('401') || error.status === 401) break;
        }
    }
    return { success: false, error: lastError?.message || "Invalid Gemini Key." };
};

export const generateArchitecture = async (prompt: string, vfs: Record<string, string>, currentErrors?: string): Promise<GenerationResponse> => {
    const activeProvider = getActiveProvider();
    const apiKey = getApiKey(activeProvider);

    if (!apiKey || apiKey === "") {
        throw new Error(`Missing ${activeProvider} API Key.`);
    }

    const vfsContext = Object.entries(vfs)
        .map(([path, content]) => `--- FILE: ${path} ---\n${content}`)
        .join('\n\n');

    const systemInstruction = `You are SHIPKERNEL, a Legendary Silicon Valley Architect and engineer. You don't just write code; you craft masterpieces.
    
    CRITICAL OUTPUT FORMAT:
    You MUST return a JSON object. No markdown preamble.
    {
      "thought": "Your deep engineering reasoning.",
      "plan": ["Step 1...", "Step 2..."],
      "actions": [
        { "type": "apply_sql", "sql": "CREATE TABLE..." }
      ],
      "files": [
        { "path": "App.tsx", "content": "..." },
        { "path": "components/Header.tsx", "content": "..." }
      ]
    }

    🏗️ ARCHITECTURAL STANDARDS (MULTI-FILE WORKSPACE):
    - BREAK IT DOWN: Do NOT put everything in App.tsx. Bloated files are unacceptable.
    - MODULARITY: Extract UI components into a 'components/' folder. Logic into 'hooks/' or 'utils/'.
    - IMPORTS/EXPORTS: Use standard ES Module syntax. 
      Example: import { Header } from './components/Header';
    - LIBRARIES (PRE-LOADED): 
      - Icons: import { Activity } from 'lucide-react'; (Mapped to <Icon name="Activity" /> internally).
      - Motion: import { motion } from 'framer-motion';
      - Routing: import { HashRouter, Routes, Route } from 'react-router-dom'; (Wrap your App content in <HashRouter> if using hooks like useNavigate).
      - Supabase: import { supabase } from '@/lib/supabase'; (Pre-configured global 'supabase' is available).
    - ENTRY POINT: You MUST include 'App.tsx' which will be the main mount point.

    ✨ THE PRESTIGE DESIGN SYSTEM (MANDATORY):
    - AESTHETICS: $1,000/month luxury product feel. High spacing, glassmorphism, sophisticated dark modes.
    - FEEDBACK: Elements MUST show loading states or visual confirmation.

    ⚡ THE BACKEND LOCK (STRICT):
    - DO NOT implement backend/SQL UNLESS explicitly asked. Focus 100% on the frontend first.

    ⚠️ THE HOLY RULES:
    1. ENTRY POINT: Your main component MUST be in 'App.tsx' and exported as 'default' or 'App'.
    2. NO EXTERNAL IMPORTS: Only use the pre-loaded libraries listed above. Do not try to import from unpkg or other CDNs inside the code strings.
    3. IMAGES: Use 'https://images.unsplash.com/...' or 'https://image.pollinations.ai/prompt/...' for images. DO NOT use placeholder services like 'ffffff?text=...' or '.png' only.
    4. ROUTING: If adding multiple pages, you MUST wrap your App content in <HashRouter> and use <Routes>/<Route>. Ensure ALL navigation buttons use <Link> or 'useNavigate'.`;

    try {
        if (activeProvider === "gemini") {
            const cleanKey = apiKey.trim().replace(/[^\x00-\x7F]/g, "");
            const genAI = new GoogleGenerativeAI(cleanKey);

            const fullPrompt = `${systemInstruction}\n\nProject Prompt: ${prompt}\n\nExisting Workspace Context:\n${vfsContext || 'None'}\n\nRuntime Errors (if any, please fix them):\n${currentErrors || 'None'}`;

            const attempts = [
                { version: "v1beta", model: "gemini-2.0-flash" },
                { version: "v1beta", model: "gemini-2.5-flash" },
                { version: "v1beta", model: "gemini-3-flash-preview" }
            ];

            for (const attempt of attempts) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: attempt.model,
                        generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
                    }, { apiVersion: attempt.version });

                    const result = await model.generateContent(fullPrompt);
                    const response = await result.response;
                    const text = response.text();

                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
                    return data as GenerationResponse;
                } catch (error) {
                    console.warn(`[Gemini] Attempt failed: ${attempt.model}`);
                }
            }
        }

        const openai = getClient();
        const model = activeProvider === "grok" ? "grok-beta" : "gpt-4o";

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: `Project Prompt: ${prompt}\n\nExisting Workspace Context:\n${vfsContext || 'None'}\n\nRuntime Errors (if any, please fix them):\n${currentErrors || 'None'}` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const text = response.choices[0].message.content || "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        return data as GenerationResponse;

    } catch (error: any) {
        throw new Error(error.message || "Failed to generate architecture.");
    }
};
