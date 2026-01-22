import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" showText={true} />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-display font-bold text-foreground">{t("notFound.title")}</h1>
          <p className="text-xl text-muted-foreground">{t("notFound.message")}</p>
          <p className="text-sm text-muted-foreground">
            {t("notFound.description")}
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          size="lg"
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          {t("notFound.returnHome")}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
