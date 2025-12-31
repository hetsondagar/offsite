import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ArrowLeft, Loader2, HardHat, Briefcase, Crown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Role, UserRole } from "@/lib/permissions";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Step = "details" | "role";

export default function Signup() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleDetailsSubmit = () => {
    if (!email || !password || !name) {
      setError("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (!email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    setStep("role");
  };

  const handleRoleSelect = async (selectedRole: Role) => {
    setRole(selectedRole);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          role: selectedRole,
          phone: phone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      if (data.success && data.data) {
        const { user, accessToken } = data.data;
        
        dispatch(login({
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone || phone || undefined,
          userId: user.id,
          accessToken: accessToken,
        }));

        navigate("/");
      } else {
        throw new Error(data.message || 'Signup failed');
      }
    } catch (err: any) {
      // Better error message handling
      let errorMessage = 'An error occurred during signup';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Handle specific error codes
      if (errorMessage.includes('already exists') || errorMessage.includes('409')) {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (errorMessage.includes('Validation error')) {
        errorMessage = 'Please check your input fields and try again.';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header Section - Dark Background */}
      <div className="relative bg-gradient-to-b from-background via-background to-background/95 pt-12 pb-8 px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle variant="icon" />
        </div>

        {/* Back Button & Title */}
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/login")}
            className="text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-semibold text-foreground">Create Account</h1>
        </div>

        <div className="relative z-10 flex flex-col items-center space-y-4">
          {/* Centered Logo */}
          <Logo size="lg" showText={false} variant="plain" />
        </div>
      </div>

      {/* Content Area - White/Light Background */}
      <div className="flex-1 bg-card rounded-t-3xl -mt-6 relative z-10 px-6 py-8">
        {/* Details Step */}
        {step === "details" && (
          <div className="space-y-6 animate-fade-up">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-1">
                Get Started
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your details to create an account
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pr-4 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-4 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              {/* Phone Number Field (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Phone Number <span className="text-muted-foreground">(Optional)</span>
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-4 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <Button 
                className="w-full mt-8"
                size="lg"
                onClick={handleDetailsSubmit}
                disabled={!email || !password || !name || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "CONTINUE"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Role Selection Step */}
        {step === "role" && (
          <div className="space-y-4 animate-fade-up">
            <div className="text-center mb-6">
              <h2 className="font-display text-xl font-semibold text-foreground mb-1">
                Select your role
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose how you'll use OffSite
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                  "hover:border-primary/50 hover:bg-primary/5",
                  role === UserRole.SITE_ENGINEER ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.SITE_ENGINEER)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                    <HardHat className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-base text-foreground">
                      Site Engineer
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create DPRs, mark attendance, raise requests
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                  "hover:border-primary/50 hover:bg-primary/5",
                  role === UserRole.PROJECT_MANAGER ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.PROJECT_MANAGER)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-base text-foreground">
                      Project Manager
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      View dashboards, approve requests, insights
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "p-4 rounded-xl border-2 cursor-pointer transition-all duration-300",
                  "hover:border-primary/50 hover:bg-primary/5",
                  role === UserRole.OWNER_ADMIN ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.OWNER_ADMIN)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-base text-foreground">
                      Owner / Admin
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Full access, all projects, analytics
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setStep("details")}
              disabled={isLoading}
            >
              Back
            </Button>
          </div>
        )}

        {/* Sign In Link */}
        <div className="text-center mt-8 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              LOG IN
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
