import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/services/api/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
            Forgot Password?
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Enter your email address and we'll send you a link to reset your password.
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
                  Check Your Email
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  If an account with <span className="font-medium text-foreground">{email}</span> exists, 
                  we've sent you a password reset link. Please check your inbox and follow the instructions.
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  The link will expire in 15 minutes.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => navigate('/login')}
              >
                Back to Login
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
              >
                Send Another Email
              </Button>
            </div>
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

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 text-lg bg-transparent border-0 border-b-2 border-border/50 rounded-none px-0 focus:border-primary focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit"
                className="w-full mt-8"
                size="lg"
                disabled={!email || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center mt-8 pt-6 border-t border-border/50">
          <Link 
            to="/login" 
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

