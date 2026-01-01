import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { useAppSelector } from "@/store/hooks";
import { AlertCircle, Download, Receipt, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { invoicesApi, Invoice } from "@/services/api/invoices";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InvoicingPage() {
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [finalizingId, setFinalizingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'owner') {
      return;
    }
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        const data = await invoicesApi.getAll(1, 100);
        setInvoices(data?.invoices || []);
      } catch (error: any) {
        console.error('Error loading invoices:', error);
        toast.error(error?.message || 'Failed to load invoices');
      } finally {
        setIsLoading(false);
      }
    };
    loadInvoices();
  }, [role]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleFinalize = async (invoiceId: string) => {
    try {
      setFinalizingId(invoiceId);
      const updated = await invoicesApi.finalize(invoiceId);
      toast.success('Invoice finalized successfully');
      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoiceId ? updated : inv))
      );
      setSelectedInvoice(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to finalize invoice');
    } finally {
      setFinalizingId(null);
    }
  };

  const handleDownload = async (invoiceId: string) => {
    try {
      setDownloadingId(invoiceId);
      const blob = await invoicesApi.downloadPDF(invoiceId);
      const invoice = invoices.find((inv) => inv._id === invoiceId);
      const filename = invoice?.invoiceNumber
        ? `Invoice-${invoice.invoiceNumber}.pdf`
        : `Invoice-${invoiceId}.pdf`;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  // Owner-only access check
  if (role !== 'owner') {
    return (
      <MobileLayout role={role || "owner"}>
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

  return (
    <MobileLayout role={role || "owner"}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">GST Invoices</h1>
              <p className="text-xs text-muted-foreground">Owner-only invoicing</p>
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
                key={invoice._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  variant="gradient"
                  className={cn(
                    "cursor-pointer transition-all duration-300",
                    "hover:border-primary/30 hover:shadow-glow-sm",
                    selectedInvoice === invoice._id && "border-primary shadow-glow-md"
                  )}
                  onClick={() => setSelectedInvoice(selectedInvoice === invoice._id ? null : invoice._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Receipt className="w-4 h-4 text-primary" />
                          <h3 className="font-display font-semibold text-foreground">
                            {invoice.invoiceNumber || `DRAFT-${invoice._id.slice(-6)}`}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {typeof invoice.projectId === 'object' ? invoice.projectId.name : 'Unknown Project'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(invoice.billingPeriod.from)} - {formatDate(invoice.billingPeriod.to)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <StatusBadge
                          status={
                            invoice.status === "FINALIZED"
                              ? "success"
                              : "pending"
                          }
                          label={invoice.status}
                        />
                        <StatusBadge
                          status={
                            invoice.paymentStatus === "PAID"
                              ? "success"
                              : invoice.paymentStatus === "PARTIALLY_PAID"
                              ? "warning"
                              : "error"
                          }
                          label={invoice.paymentStatus.replace('_', ' ')}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-3">
                      <div className="text-muted-foreground">
                        <p>Taxable: {formatCurrency(invoice.taxableAmount)}</p>
                        <p className="text-xs">
                          {invoice.gstType === 'CGST_SGST' 
                            ? `CGST + SGST (${invoice.gstRate}%)`
                            : `IGST (${invoice.gstRate}%)`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-lg text-foreground">
                          {formatCurrency(invoice.totalAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.gstType === 'CGST_SGST'
                            ? `CGST: ${formatCurrency(invoice.cgstAmount)} | SGST: ${formatCurrency(invoice.sgstAmount)}`
                            : `IGST: ${formatCurrency(invoice.igstAmount)}`}
                        </p>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {selectedInvoice === invoice._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-border/50 space-y-4"
                      >
                        {/* Supplier & Client Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-xl bg-muted/50">
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Supplier</h4>
                            <p className="text-sm font-medium text-foreground">{invoice.supplier.companyName}</p>
                            <p className="text-xs text-muted-foreground">{invoice.supplier.address}</p>
                            <p className="text-xs text-muted-foreground">GSTIN: {invoice.supplier.gstin}</p>
                            <p className="text-xs text-muted-foreground">State: {invoice.supplier.state}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-muted/50">
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Client</h4>
                            <p className="text-sm font-medium text-foreground">{invoice.client.name}</p>
                            <p className="text-xs text-muted-foreground">{invoice.client.address}</p>
                            {invoice.client.gstin && (
                              <p className="text-xs text-muted-foreground">GSTIN: {invoice.client.gstin}</p>
                            )}
                            <p className="text-xs text-muted-foreground">State: {invoice.client.state}</p>
                          </div>
                        </div>

                        {/* GST Breakdown */}
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                          <h4 className="text-sm font-medium text-foreground mb-2">GST Breakdown</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Taxable Amount</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(invoice.taxableAmount)}
                              </span>
                            </div>
                            {invoice.gstType === 'CGST_SGST' ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">CGST ({invoice.gstRate / 2}%)</span>
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(invoice.cgstAmount)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">SGST ({invoice.gstRate / 2}%)</span>
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(invoice.sgstAmount)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">IGST ({invoice.gstRate}%)</span>
                                <span className="font-medium text-foreground">
                                  {formatCurrency(invoice.igstAmount)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-border/30">
                              <span className="font-semibold text-foreground">Total Amount</span>
                              <span className="font-display font-bold text-lg text-foreground">
                                {formatCurrency(invoice.totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {invoice.notes && (
                          <div className="p-3 rounded-xl bg-muted/50">
                            <h4 className="text-xs font-medium text-muted-foreground mb-1">Notes</h4>
                            <p className="text-sm text-foreground">{invoice.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {invoice.status === 'DRAFT' && (
                            <Button
                              variant="default"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFinalize(invoice._id);
                              }}
                              disabled={finalizingId === invoice._id}
                            >
                              {finalizingId === invoice._id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Finalizing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Finalize Invoice
                                </>
                              )}
                            </Button>
                          )}
                          {invoice.status === 'FINALIZED' && (
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(invoice._id);
                              }}
                              disabled={downloadingId === invoice._id}
                            >
                              {downloadingId === invoice._id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </>
                              )}
                            </Button>
                          )}
                        </div>
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
