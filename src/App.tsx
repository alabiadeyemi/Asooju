import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// Public pages
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import Changelog from "./pages/Changelog";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// App pages
import Dashboard from "./pages/app/Dashboard";
import NewProject from "./pages/app/NewProject";
import Projects from "./pages/app/Projects";
import ProjectBuilder from "./pages/app/ProjectBuilder";
import Settings from "./pages/app/Settings";
import Admin from "./pages/app/Admin";
import ExportPage from "./pages/app/ExportPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />

          {/* App (with sidebar layout) */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="new" element={<NewProject />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectBuilder />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/billing" element={<Settings />} />
            <Route path="settings/keys" element={<Settings />} />
            <Route path="settings/providers" element={<Settings />} />
          </Route>

          {/* Export / Deploy */}
          <Route path="/export/:projectId" element={<AppLayout />}>
            <Route index element={<ExportPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AppLayout />}>
            <Route index element={<Admin />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
