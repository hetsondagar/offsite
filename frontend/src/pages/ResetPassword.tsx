import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, XCircle } from "lucide-react";
import { resetPassword } from "@/services/api/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      setError("Invalid reset link. Please request a new password reset.");
    } else {
      setIsValidToken(true);
    }
  }, [token]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError("Invalid reset link");
      return;
    }

    // Validation
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
      setIsValidToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === false && !success) {
    return (
      <div className="min-h-screen bg-background flex flex-col w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <div className="relative bg-gradient-to-b from-background via-background to-background/95 pt-12 pb-8 px-6">
          <div className="absolute top-4 right-4 z-20">
            <ThemeToggle variant="icon" />
          </div>
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <Logo size="lg" showText={false} variant="plain" />
          </div>
        </div>

        <div className="flex-1 bg-card rounded-t-3xl -mt-6 relative z-10 px-6 py-8">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Invalid or Expired Link
              </h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <div className="flex gap-4 mt-6">
              <Button onClick={() => navigate('/forgot-password')}>
                Request New Link
              </Button>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
      {/* Header Section */}
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

        <div className="relative z-10 flex flex-col items-center space-y-4">
          {/* Centered Logo */}
          <Logo size="lg" showText={false} variant="plain" />
          
          {/* Title */}
          <h1 className="font-display text-2xl font-bold text-foreground text-center">
            Reset Your Password
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Enter your new password below.
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-card rounded-t-3xl -mt-6 relative z-10 px-6 py-8">
        {success ? (
          <div className="space-y-6 animate-fade-up">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Password Reset Successful!
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Your password has been reset successfully. You will be redirected to the login page shortly.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up">
            <div className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* New Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (min. 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-12 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isLoading}
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
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-12 h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                className="w-full mt-8"
                size="lg"
                disabled={!newPassword || !confirmPassword || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center mt-8 pt-6 border-t border-border/50">
          <Link 
            to="/login" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

