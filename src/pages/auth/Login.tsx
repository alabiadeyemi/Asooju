import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Eye, EyeOff, Github, Chrome, Quote, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { loginWithGitHub, loginWithEmail, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      await loginWithEmail(email, password);
      navigate("/auth/onboarding");
    } catch (error: any) {
      if (error?.code === "EMAIL_NOT_CONFIRMED" || error?.message === "EMAIL_NOT_CONFIRMED") {
        navigate(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      setAuthError(error.message || "Invalid login credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex overflow-hidden font-sans">
      {/* Left Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden">
        {/* Background Ambience */}
        <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] pointer-events-none" />

        <Link
          to="/"
          className="absolute top-10 left-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors group z-20"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] relative z-10"
        >
          <div className="mb-10">
            <Logo showText className="mb-6" />
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Welcome Back</h1>
            <p className="text-muted-foreground font-medium text-sm">Enter your credentials to access your dashboard.</p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="h-12 bg-white/5 border-white/5 rounded-xl px-4 focus-visible:ring-primary/20 transition-all placeholder:text-white/5"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Password</Label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-[10px] font-black uppercase tracking-widest text-primary/80 hover:text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-white/5 border-white/5 rounded-xl px-4 pr-12 focus-visible:ring-primary/20 transition-all placeholder:text-white/5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {authError}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                variant="hero"
                className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-[13px] shadow-xl shadow-white/5 active:scale-[0.98] transition-all"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-[#020202] px-3 text-muted-foreground/40">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => loginWithGitHub()}
                className="h-12 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 group transition-all"
              >
                <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => loginWithGoogle()}
                className="h-12 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 group transition-all"
              >
                <Chrome className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Google
              </Button>
            </div>

            <div className="pt-8">
              <Button
                variant="outline"
                onClick={() => { loginAsGuest(); navigate("/app"); }}
                className="w-full h-12 rounded-xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-black uppercase tracking-widest text-[11px] group transition-all"
              >
                Enter as Guest
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40 mt-6 transition-all">
              New to Asooju?{" "}
              <Link to="/auth/signup" className="text-primary hover:text-primary/80 hover:underline transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right Side: Image/Branding */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=2532&auto=format&fit=crop"
          alt="Abstract Digital Background"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 contrast-125"
        />
        <div className="absolute inset-x-12 bottom-20 z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-1 w-12 bg-white/20 rounded-full" />
              <Quote className="w-8 h-8 text-primary/40" />
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight mb-6">
              "The best way to <br /> <span className="text-primary italic">predict</span> the future is to create it."
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10" />
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest">Built by Builders</div>
                <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Community Powered Flow</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
