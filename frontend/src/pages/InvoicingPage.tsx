import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { usePermissions } from "@/hooks/usePermissions";
import { AlertCircle } from "lucide-react";
import { 
  ArrowLeft, 
  Download,
  FileText,
  Calendar,
  Building2,
  ChevronRight,
  Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { invoicesApi } from "@/services/api/invoices";
import { Loader2 } from "lucide-react";

export default function InvoicingPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        const data = await invoicesApi.getAll(1, 100);
        setInvoices(data?.invoices || []);
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInvoices();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Permission check
  if (!hasPermission("canViewInvoices") && !hasPermission("canManageInvoices")) {
    return (
      <MobileLayout role="owner">
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view invoices. Only Owners can access this page.
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  const handleDownload = (invoiceId: string) => {
    // Mock download - in production, this would generate and download PDF
    console.log(`Downloading invoice ${invoiceId}`);
  };

  return (
    <MobileLayout role="manager">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">Invoices</h1>
              <p className="text-xs text-muted-foreground">GST-ready invoicing</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="p-8 text-center">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No invoices found</p>
                <p className="text-sm text-muted-foreground">Create your first invoice to get started</p>
              </CardContent>
            </Card>
          ) : (
            invoices.map((invoice, index) => (
              <motion.div
                key={invoice._id || invoice.invoiceId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  variant="gradient"
                  className={cn(
                    "cursor-pointer transition-all duration-300",
                    "hover:border-primary/30 hover:shadow-glow-sm",
                    selectedInvoice === (invoice._id || invoice.invoiceId) && "border-primary shadow-glow-md"
                  )}
                  onClick={() => setSelectedInvoice(selectedInvoice === (invoice._id || invoice.invoiceId) ? null : (invoice._id || invoice.invoiceId))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Receipt className="w-4 h-4 text-primary" />
                          <h3 className="font-display font-semibold text-foreground">
                            {invoice.invoiceId || invoice._id}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeof invoice.projectId === 'object' ? invoice.projectId.name : 'Unknown Project'}
                        </p>
                      </div>
                      <StatusBadge 
                        status={invoice.status === "paid" ? "success" : invoice.status === "overdue" ? "error" : "pending"}
                        label={invoice.status}
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-lg text-foreground">
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          GST: {formatCurrency(invoice.gst)}
                        </p>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {(selectedInvoice === (invoice._id || invoice.invoiceId)) && (
                      <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-border/50 space-y-4"
                    >
                      {/* Items Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Items</h4>
                        {invoice.items && invoice.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{item.name}</span>
                              <span className="text-sm font-medium text-foreground">
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Qty: {item.qty} × {formatCurrency(item.rate)}</span>
                              <span>GST {item.gst || 18}%: {formatCurrency(item.gst || (item.amount * 0.18))}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* GST Breakdown */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <h4 className="text-sm font-medium text-foreground mb-2">GST Breakdown</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(invoice.subtotal)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">GST (18%)</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(invoice.gst)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/30">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-display font-bold text-lg text-foreground">
                              {formatCurrency(invoice.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(invoice.invoiceId || invoice._id);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoice
                      </Button>
                    </motion.div>
                    )}
                </CardContent>
              </Card>
            </motion.div>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

