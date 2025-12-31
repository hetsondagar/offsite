import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { ArrowLeft, Loader2, HardHat, Briefcase, Crown, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Role, UserRole } from "@/lib/permissions";

type Step = "phone" | "otp" | "role";

export default function Signup() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStep("otp");
  };

  const handleOtpSubmit = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStep("role");
  };

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    dispatch(login({
      role: selectedRole,
      phone: phone,
      userId: `user_${Date.now()}`,
    }));
    navigate("/");
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
        {/* Phone Input Step */}
        {step === "phone" && (
          <div className="space-y-6 animate-fade-up">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-1">
                Get Started
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your phone number to create an account
              </p>
            </div>

            <div className="space-y-4">
              {/* Phone Number Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-8 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Sign Up Button */}
              <Button 
                className="w-full mt-8"
                size="lg"
                onClick={handlePhoneSubmit}
                disabled={phone.length < 10 || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "SIGN UP"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <div className="space-y-6 animate-fade-up">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-1">
                Verify OTP
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">OTP</label>
                <Input
                  type="text"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  className="h-14 text-2xl text-center tracking-[1em] bg-transparent border-0 border-b-2 border-border/50 rounded-none font-mono focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  maxLength={6}
                />
              </div>

              <Button 
                className="w-full mt-8"
                size="lg"
                onClick={handleOtpSubmit}
                disabled={otp.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "VERIFY"
                )}
              </Button>

              <button className="w-full text-sm text-primary hover:underline text-center">
                Resend OTP
              </button>
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
