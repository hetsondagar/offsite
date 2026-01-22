import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store/hooks";
import { login } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }

    if (!navigator.onLine) {
      setError(t("auth.offlineError"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t("auth.loginFailed"));
      }

      if (data.success && data.data) {
        const { user, accessToken } = data.data;
        
        dispatch(login({
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone || undefined,
          userId: user.id,
          accessToken: accessToken,
        }));

        navigate("/");
      } else {
        throw new Error(data.message || t("auth.loginFailed"));
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Failed to fetch') || msg.includes('ERR_CONNECTION_REFUSED')) {
        setError(t("auth.cannotReachBackend"));
      } else {
        setError(err.message || t("auth.errorOccurred"));
      }
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

        {/* Theme Toggle and Language Toggle - Top Right */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
          <LanguageToggle variant="icon" />
          <ThemeToggle variant="icon" />
        </div>

        <div className="relative z-10 flex flex-col items-center space-y-3 sm:space-y-4">
          {/* Centered Logo */}
          <Logo size="lg" showText={false} variant="plain" />
          
          {/* Welcome Text */}
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center">
            {t("auth.welcomeBack")}
          </h1>
        </div>
      </div>

      {/* Content Area - White/Light Background */}
      <div className="flex-1 bg-card rounded-t-3xl -mt-6 relative z-10 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="space-y-4 sm:space-y-6 animate-fade-up max-w-md mx-auto w-full">
          <div className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <p className="text-xs sm:text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-foreground">{t("auth.email")}</label>
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
              <label className="text-xs sm:text-sm font-medium text-foreground">{t("auth.password")}</label>
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
              <Link 
                to="/forgot-password" 
                className="text-xs sm:text-sm text-primary hover:underline text-right w-full mt-1 block"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="text-xs sm:text-sm font-medium leading-none cursor-pointer text-foreground"
                >
                  {t("auth.rememberMe")}
                </label>
              </div>
            </div>

            {/* Login Button */}
            <Button 
              className="w-full mt-6 sm:mt-8 h-12 sm:h-14 text-base sm:text-lg"
              size="lg"
              onClick={handleLogin}
              disabled={!email || !password || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t("auth.login")
              )}
            </Button>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border/50 max-w-md mx-auto w-full">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              {t("auth.signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
