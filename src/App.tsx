import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import Changelog from "./pages/Changelog";
import Templates from "./pages/Templates";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import VerifyEmail from "./pages/auth/VerifyEmail";
import Onboarding from "./pages/auth/Onboarding";

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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/verify" element={<VerifyEmail />} />
            <Route path="/auth/onboarding" element={<Onboarding />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="new" element={<NewProject />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectBuilder />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/billing" element={<Settings />} />
              <Route path="settings/keys" element={<Settings />} />
              <Route path="settings/providers" element={<Settings />} />
            </Route>

            <Route
              path="/export/:projectId"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ExportPage />} />
            </Route>

            {/* Admin: not in sidebar — open /admin only if you're an admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Admin />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
