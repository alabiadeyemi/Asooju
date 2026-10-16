# <img src="public/favicon.svg" width="40" height="40" /> Asooju

##  The Future of AI-Orchestrated Software Engineering

**Asooju** is a high-fidelity, autonomous development platform designed to bridge the gap between abstract architectural vision and production-ready implementation. Engineered with an "Obsidian" aesthetic and powered by a multi-model AI core, Asooju allows developers to design, generate, and deploy complex software systems with surgical precision.

---

##  The Architecture of Excellence

Asooju isn't just a code generator; it's a full-spectrum engineering workspace.

###  1. Multi-Model Intelligence Center
Harness the world's most powerful LLMs simultaneously. Asooju supports:
- **OpenAI GPT-4o**: The gold standard for logic and structural integrity.
- **Google Gemini 1.5 Pro**: Massive context windows for system-wide refactoring.
- **xAI Grok-1**: High-performance, real-time reasoning.
- **Anthropic Claude 3.5**: Nuanced coding with superior natural language understanding.
- **BYOK (Bring Your Own Key)**: Full sovereignty over your API usage, allowing for unlimited generation at cost.

###  2. Obsidian Design System
A premium UI experience built for the professional developer:
- **Glassmorphism & Depth**: Multi-layered surfaces with high-fidelity blur effects.
- **Atomic Animations**: Powered by *Framer Motion* for 60fps micro-interactions.
- **Responsive Geometry**: A layout that breathes, from ultra-wide monitors to high-density mobile displays.
- **The Asooju mark**: A pulsating, animated hexagonal core symbolizing the heartbeat of your project.

###  3. Deep Ecosystem Integration
- **GitHub Sync**: Automatic repository creation with the newly implemented `repo` scope. Version control is no longer a manual task—it's part of the flow.
- **Vercel / Live Hosting**: One-click deployment pipeline to global production servers.
- **Supabase Backbone**: Enterprise-grade authentication and real-time PostgreSQL persistence for every project.

###  4. Community Marketplace & Templates
- **Architectural Blueprints**: Browse a curated selection of community layouts.
- **One-Click Templates**: Instantly fork a template into your own workspace to accelerate development.
- **Categorized Discovery**: Filter through E-Commerce, SaaS, Dashboards, and Portfolio categories.

###  5. Advanced Settings & API Management
- **Key Sovereignty**: Securely manage your AI provider keys (OpenAI, Gemini, Grok, Anthropic) with local persistence.
- **Model Switching**: Hot-swap between different models to find the best logic-to-speed ratio for your specific build.
- **Usage Vitals**: Monitor your platform activity and project counts in real-time.

---

##  Technical Deep-Dive

### **The Intelligence Core (`src/services/ai-service.ts`)**
- **Symmetric Routing**: Logic that dynamically routes prompts to the appropriate model based on length and complexity.
- **Streaming Tokens**: Real-time response rendering for a low-latency chat experience.

### **The Version Control Engine (`src/services/github-service.ts`)**
- **OAuth Persistence**: Seamless integration with GitHub tokens via Supabase Auth.
- **Automatic Repo Provisioning**: Scripted creation of private/public repos upon first push.
- **Unicode-Safe Pre-processing**: Uses URI-encoding and char-mapping to ensure large, complex files are encoded safely for GitHub's API.

### **The Real-time Persistence (`src/integrations/supabase`)**
- **Row Level Security (RLS)**: Your projects are strictly associated with your user ID.
- **Edge Functions**: Handlers for complex backend logic that requires specific permissions.

---

##  Technical Specifications

### **The Core Stack**
- **Frontend Engine**: React 18 + TypeScript (Strict Mode)
- **Build System**: Vite (optimized for sub-second HMR)
- **Styling Intelligence**: Tailwind CSS + Custom Design Tokens
- **State Architecture**: Custom React Hooks with Supabase Realtime
- **UI Components**: Radix UI Primitives + shadcn/ui custom extensions

### **Advanced Features**
- **Unicode-Safe Encoding**: Robust Base64 mapping for complex project code (no more `btoa` crashes).
- **Guest Access Engine**: Instant "Architect Mode" entry for rapid prototyping without barriers.
- **Step-Indicator Navigation**: A guided flow for project creation, ensuring no architectural detail is missed.

---

## Getting Started for Engineers

### Local Environment Setup
Ensure you have [Node.js](https://nodejs.org/) (v18+) and [npm](https://www.npmjs.com/) installed.

```bash
git clone https://github.com/00xf5/project-forge.git
cd project-forge
npm install
```

Copy env vars and run the Supabase schema — see [`supabase/SETUP.md`](supabase/SETUP.md) and [`.env.example`](.env.example).

```bash
cp .env.example .env   # fill VITE_SUPABASE_* and server keys as needed
npm run dev
```

**Admin:** not in the sidebar. Open `/admin` only if your user has `app_metadata.role = "admin"`.

**AI:** add provider keys in Settings (BYOK, stored in the browser). Multifile generation writes to `vfs_files` and previews in the sandbox.

### Builder preview vs build verify (important on Vercel)

The builder has **two different preview paths**:

| What | Default | Purpose |
|------|---------|--------|
| **On-screen preview** | **Draft** (iframe sandbox) | Stable default. Toggle **Live** for Sandpack / export-shaped bundler (matches GitHub/ZIP). |
| **Build / auto-fix gate** | **Draft** iframe verify by default | Agent **auto-continues** waves only when verify is “live”. Set `VITE_BUILD_VERIFY_BUNDLER=1` to verify via export Sandpack while UI stays **Draft**. |

To align **wave verify** with **export/GitHub** (Sandpack on `prepareExportBundle`) **without** changing the default iframe UI, set:

```bash
VITE_BUILD_VERIFY_BUNDLER=1
```

**On Vercel (Asooju app itself):**

1. [Vercel Dashboard](https://vercel.com) → your **Asooju** project → **Settings** → **Environment Variables**
2. Add **`VITE_BUILD_VERIFY_BUNDLER`** = **`1`** for **Production** (and **Preview** if you use preview deployments)
3. **Redeploy** (env vars are baked in at build time for Vite)

**Local:**

```bash
# in .env
VITE_BUILD_VERIFY_BUNDLER=1
```

Restart `npm run dev` after changing `.env`.

**Force Live bundler UI:** `VITE_PREVIEW_V2=1` in env, or choose **Live** in the preview panel (saved in browser).

**Smoke check after enabling verify bundler**

1. Open a project → **Build** mode → prompt that triggers **standard** (2-wave) scale, e.g. dashboard + auth + Supabase.
2. Leave **Bundler** toggle **off** (iframe stays visible).
3. Let wave 1 finish: if preview verify fails, the agent should **not** auto-start wave 2 (broken preview).
4. Fix or adjust until wave 1 verify passes; wave 2 should auto-continue only when bundler verify reports **live**.
5. Terminal may show `PREVIEW (bundler): …` on compile errors.

More detail: [`docs/DISCOVERED_ISSUES.md`](docs/DISCOVERED_ISSUES.md) (quick verify table) · [`HOW_TO_RUN.md`](HOW_TO_RUN.md)

---

##  Security & Sovereignty

- **Data Privacy**: Asooju never stores your raw BYOK API keys on its servers; they stay in your browser on that device and are sent only when needed for generation. Do not use BYOK on a shared or untrusted device.
- **Code Ownership**: You own 100% of the generated source code. Always.
- **Foundry Standards**: Built to follow SOC2-ready patterns for enterprise-ready software.

---

## 💎 The Asooju Vision

*"The best way to predict the future is to create it."*

We believe software development should be about **creativity**, not **syntax**. Asooju is built for people who want to focus on the *what* and the *why*. It handles the *how*.

Built with engineering precision by the **Asooju Core Team**.

---

<p align="center">
  <img src="public/favicon.svg" width="100" />
  <br />
  <strong>ASOOJU</strong><br />
  <em>Design. Build. Ship.</em>
</p>
