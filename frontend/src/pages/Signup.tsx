import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ArrowLeft, Loader2, HardHat, Briefcase, Crown, Eye, EyeOff, ShoppingCart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Role, UserRole } from "@/lib/permissions";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Step = "details" | "role";

export default function Signup() {
  const { t } = useTranslation();
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

    if (!navigator.onLine) {
      setError("You are offline. Connect to the internet (or start the local backend) to sign up.");
      setIsLoading(false);
      return;
    }

    try {
      // Build request body - only include phone if it's provided and not empty
      const requestBody: any = {
        email,
        password,
        name,
        role: selectedRole,
      };
      
      // Only include phone if it's provided and not empty
      if (phone && phone.trim().length > 0) {
        requestBody.phone = phone.trim();
      }

      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

      if (String(errorMessage).includes('Failed to fetch') || String(errorMessage).includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Cannot reach backend API. Start the backend on http://localhost:3000 (and MongoDB), then try again.';
      } else if (
        errorMessage.toLowerCase().includes('email') && 
        (errorMessage.includes('already exists') || errorMessage.includes('already registered'))
      ) {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (
        errorMessage.toLowerCase().includes('phone') && 
        errorMessage.includes('already exists')
      ) {
        errorMessage = 'This phone number is already registered. Use a different number or leave it empty.';
      } else if (errorMessage.includes('already exists') || errorMessage.includes('409')) {
        errorMessage = 'Signup failed. Please try again.';
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
    <div className="min-h-screen bg-background flex flex-col w-full overflow-x-hidden">
      {/* Header Section - Dark Background */}
      <div className="relative bg-gradient-to-b from-background via-background to-background/95 pt-8 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        {/* Theme Toggle - Top Right */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <ThemeToggle variant="icon" />
        </div>

        {/* Back Button & Title */}
        <div className="relative z-10 flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/login")}
            className="text-foreground tap-target"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="font-display text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Create Account</h1>
        </div>

        <div className="relative z-10 flex flex-col items-center space-y-3 sm:space-y-4">
          {/* Centered Logo */}
          <Logo size="lg" showText={false} variant="plain" />
        </div>
      </div>

      {/* Content Area - White/Light Background */}
      <div className="flex-1 bg-card rounded-t-3xl -mt-6 relative z-10 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Details Step */}
        {step === "details" && (
          <div className="space-y-4 sm:space-y-6 animate-fade-up max-w-md mx-auto w-full">
            <div>
              <h2 className="font-display text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1">
                Get Started
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Enter your details to create an account
              </p>
            </div>

            {error && (
              <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-xs sm:text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pr-4 h-12 sm:h-14 text-base sm:text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-4 h-12 sm:h-14 text-base sm:text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12 h-12 sm:h-14 text-base sm:text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-muted-foreground hover:text-foreground transition-colors tap-target"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t('auth.passwordMinLength')}</p>
              </div>

              {/* Phone Number Field (Optional) */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">
                  Phone Number <span className="text-muted-foreground">(Optional)</span>
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pr-4 h-12 sm:h-14 text-base sm:text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Continue Button */}
              <Button 
                className="w-full mt-6 sm:mt-8 h-12 sm:h-14 text-base sm:text-lg"
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
          <div className="space-y-4 animate-fade-up max-w-md mx-auto w-full">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="font-display text-lg sm:text-xl md:text-2xl font-semibold text-foreground mb-1">
                Select your role
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Choose how you'll use OffSite
              </p>
            </div>

            {error && (
              <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-xs sm:text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div
                className={cn(
                  "p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 tap-target",
                  "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                  role === UserRole.SITE_ENGINEER ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.SITE_ENGINEER)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/30 shrink-0">
                    <HardHat className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
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
                  "p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 tap-target",
                  "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                  role === UserRole.PROJECT_MANAGER ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.PROJECT_MANAGER)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/30 shrink-0">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
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
                  "p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 tap-target",
                  "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                  role === UserRole.OWNER_ADMIN ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.OWNER_ADMIN)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/30 shrink-0">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
                      Owner / Admin
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Full access, all projects, analytics
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 tap-target",
                  "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                  role === UserRole.PURCHASE_MANAGER ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.PURCHASE_MANAGER)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shrink-0">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
                      Purchase Manager
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      View purchase requests, send materials
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 tap-target",
                  "hover:border-primary/50 hover:bg-primary/5 active:scale-[0.98]",
                  role === UserRole.CONTRACTOR ? "border-primary bg-primary/10" : "border-border/50"
                )}
                onClick={() => handleRoleSelect(UserRole.CONTRACTOR)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground">
                      Contractor
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Manage labours, mark attendance, invoices
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <Button
              variant="outline"
              className="w-full mt-4 h-12 sm:h-14"
              onClick={() => setStep("details")}
              disabled={isLoading}
            >
              Back
            </Button>
          </div>
        )}

        {/* Sign In Link */}
        <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/50 max-w-md mx-auto w-full">
          <p className="text-xs sm:text-sm text-muted-foreground">
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
