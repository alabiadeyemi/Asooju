# <img src="public/favicon.svg" width="40" height="40" /> ShipKernel

##  The Future of AI-Orchestrated Software Engineering

**ShipKernel** is a high-fidelity, autonomous development platform designed to bridge the gap between abstract architectural vision and production-ready implementation. Engineered with an "Obsidian" aesthetic and powered by a multi-model AI core, ShipKernel allows developers to design, generate, and deploy complex software systems with surgical precision.

---

##  The Architecture of Excellence

ShipKernel isn't just a code generator; it's a full-spectrum engineering workspace.

###  1. Multi-Model Intelligence Center
Harness the world's most powerful LLMs simultaneously. ShipKernel supports:
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
- **The Kernel Logo**: A pulsating, animated hexagonal core symbolizing the heartbeat of your project.

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
git clone https://github.com/yuinz/shipkernel.git
cd shipkernel
npm install
```

Copy env vars and run the Supabase schema — see [`supabase/SETUP.md`](supabase/SETUP.md).

```bash
npm run dev
```

**Admin:** not in the sidebar. Open `/admin` only if your email is in `VITE_ADMIN_EMAILS` or your user has `app_metadata.role = "admin"`.

**AI:** add provider keys in Settings (BYOK, stored in the browser). Multifile generation writes to `vfs_files` and previews in the sandbox.

---

##  Security & Sovereignty

- **Data Privacy**: ShipKernel never stores your raw API keys on its own servers if using BYOK; they are stored locally with encrypted browser persistence.
- **Code Ownership**: You own 100% of the generated source code. Always.
- **Foundry Standards**: Built to follow SOC2-ready patterns for enterprise-ready software.

---

## 💎 The ShipKernel Vision

*"The best way to predict the future is to create it."*

We believe software development should be about **creativity**, not **syntax**. ShipKernel is built for the builders who want to focus on the *what* and the *why*, while our AI Kernel handles the *how*.

Built with engineering precision by the **ShipKernel Core Team**.

---

<p align="center">
  <img src="public/favicon.svg" width="100" />
  <br />
  <strong>SHIPKERNEL</strong><br />
  <em>Design. Build. Ship.</em>
</p>
