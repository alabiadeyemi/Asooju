# Blueprint: Virtual Workspace & Multi-File Architecture

## 🎯 Objective
Transform the "Single-File Sandbox" into a professional "Virtual Workspace" that supports multi-file projects, ES Module imports, and cleanly separated architectural layers.

## 🛠️ Implementation Philosophy
- **Allergic to Broken:** Never leave the codebase in a non-functional state.
- **Stability First:** Every step must include validation (build/run checks).
- **Context Awareness:** Sync AI instructions with Sandbox capabilities at every phase.
- **Professional Standard:** Proper error handling, type safety, and premium telemetry (logs).

---

## 📅 Roadmap & Tasks

### Phase 0: ProjectBuilder De-bloating
- [x] **Task 0.1: Extract Sub-components**
  - Extract `Terminal`, `ChatSidebar`, `Toolbar`, and `FileSidebar` from `ProjectBuilder.tsx`.
  - Reduce `ProjectBuilder.tsx` size by at least 50% for better maintainability.
- [ ] **Task 0.2: Prop Drilling Optimization**
  - Use React Context if necessary or clean prop passing for extracted components.

### Phase 1: Virtual Filesystem (VFS) Core (Next Priority)
- [x] **Task 1.1: Sandbox VFS Integration**
  - Update `preview-sandbox.html` to handle a `files` map instead of a single `code` string.
  - Implement a `require`/`import` interceptor using a custom Babel plugin.
- [x] **Task 1.2: Entry Point Resolver**
  - Implement logic to identify and boot from the "Entry Point" (usually `App.tsx` or `main.tsx`).
- [ ] **Task 1.3: Recursive Transpilation**
  - Ensure all files in the VFS are transpiled and cached before the app boots.

### Phase 2: ProjectBuilder Refactor (VFS Support)
- [ ] **Task 2.1: Data Schema Update**
  - Update `ProjectBuilder.tsx` state to support an array of files.
  - Fix local storage persistence to handle the new multi-file format.
- [ ] **Task 2.2: Bridge Protocol v2**
  - Update the `postMessage` protocol to send the entire `files` map to the sandbox.

### Phase 3: AI Service Brain Upgrade
- [ ] **Task 3.1: Multi-File Schema**
  - Update `ai-service.ts` System Instruction to demand a `files` array in the JSON response.
- [ ] **Task 3.2: Module Contextualization**
  - Teach the AI how to use `import` statements and how to structure a project across folders.
- [ ] **Task 3.3: Error-Correction Loop v2**
  - Update the "Fix with AI" logic to specify *which* file in the workspace has the error.

### Phase 4: Production Polish & Telemetry
- [ ] **Task 4.1: Extension Noise Filter**
  - Filter out browser extension logs (e.g., `setBadgeText`, `content.js`) from the System Terminal.
- [ ] **Task 4.2: Performance Optimization**
  - Implement "Dirty Checking" so only modified files are re-transpiled.

---

## 🚨 Stability Checklist (Run after every task)
1. **Build Status:** Does `npm run dev` still pass?
2. **Sandbox Alive:** Does a basic "Hello World" still render?
3. **AI Logic:** Does the AI still return valid JSON?
4. **Error Cleanup:** Are there any new console errors in the parent or child?

---

## 📈 Current Project State
- **Current File:** `src/pages/app/ProjectBuilder.tsx`
- **Focus:** Phase 0 (Refactoring)
