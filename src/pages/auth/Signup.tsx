import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Eye, EyeOff, Github, Chrome, Sparkles, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { loginWithGitHub, signUpWithEmail, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signUpWithEmail(email, password, {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
        },
      });
      if (result.needsEmailVerification) {
        navigate(`/auth/verify?email=${encodeURIComponent(result.email)}`, { replace: true });
      } else {
        navigate("/auth/onboarding", { replace: true });
      }
    } catch (error: any) {
      setAuthError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex overflow-hidden font-sans">
      {/* Left Side: Image/Branding */}
      <div className="hidden lg:block lg:w-1/2 relative order-first">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent z-10" />
        <img
          src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2674&auto=format&fit=crop"
          alt="Abstract Digital Creation"
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-40 hover:opacity-50 transition-opacity duration-1000"
        />
        <div className="absolute inset-x-12 bottom-20 z-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-md"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              New possibilities
            </div>
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
              Join the <br /> <span className="text-primary italic">Global</span> <br /> Architecture.
            </h2>
            <div className="space-y-4">
              {[
                "Create professional apps in minutes",
                "Full ownership of your source code",
                "One-click deployment to anywhere"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 md:p-12 relative overflow-hidden">
        {/* Background Ambience */}
        <div className="fixed inset-0 bg-noise opacity-[0.02] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[150px] pointer-events-none" />

        <Link
          to="/"
          className="absolute top-10 right-10 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors group z-20"
        >
          Close
          <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[440px] relative z-10"
        >
          <div className="mb-10 text-center lg:text-left">
            <Logo showText className="mb-6 lg:justify-start justify-center" />
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Create Account</h1>
            <p className="text-muted-foreground font-medium text-sm">Join 10,000+ builders shipping every day.</p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">First Name</Label>
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="h-12 bg-white/5 border-white/5 rounded-xl px-4 focus-visible:ring-primary/20 transition-all placeholder:text-white/5"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Last Name</Label>
                  <Input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="h-12 bg-white/5 border-white/5 rounded-xl px-4 focus-visible:ring-primary/20 transition-all placeholder:text-white/5"
                  />
                </div>
              </div>

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
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  variant="hero"
                  className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest text-[13px] shadow-xl shadow-white/5 active:scale-[0.98] transition-all"
                >
                  {isLoading ? "Creating Account..." : "Get Started Free"}
                </Button>
              </div>
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
                Continue as Guest
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground/40 mt-6 transition-all">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary hover:text-primary/80 hover:underline transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
