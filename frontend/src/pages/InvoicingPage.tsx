import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { useAppSelector } from "@/store/hooks";
import { AlertCircle, Download, Receipt, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { invoicesApi, Invoice } from "@/services/api/invoices";
import { toast } from "sonner";
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";
import { InvoiceCard } from "@/components/invoicing/InvoiceCard";

export default function InvoicingPage() {
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [role]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await invoicesApi.getAll(1, 100);
      setInvoices(data?.invoices || []);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      toast.error(error?.message || "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalize = async (invoiceId: string) => {
    try {
      const updated = await invoicesApi.finalize(invoiceId);
      toast.success('Invoice finalized successfully');
      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoiceId ? updated : inv))
      );
      setSelectedInvoice(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to finalize invoice');
    }
  };

  const handleDelete = async (invoiceId: string) => {
    try {
      await invoicesApi.delete(invoiceId);
      toast.success('Invoice deleted successfully');
      setInvoices((prev) => prev.filter((inv) => inv._id !== invoiceId));
      setSelectedInvoice(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete invoice');
      throw error;
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowCreateForm(false);
    setSelectedInvoice(null);
  };

  const handleInvoiceUpdated = (updated: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv._id === updated._id ? updated : inv))
    );
    setEditingInvoice(null);
    toast.success('Invoice updated successfully');
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
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Invoice downloaded successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  // Role-based rendering
  if (!role) {
    return (
      <MobileLayout role="owner">
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Authentication Error
              </h2>
              <p className="text-sm text-muted-foreground">
                Please log in to continue.
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  // Owner view - full invoicing system
  if (role === "owner") {
    return (
      <MobileLayout role={role}>
        <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top">
            <div className="flex items-center gap-0 relative">
              <div className="absolute left-0 mt-2 sm:mt-3">
                <Logo size="md" showText={false} />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <h1 className="font-display font-semibold text-base sm:text-lg">GST Invoices</h1>
                <p className="text-xs text-muted-foreground">Owner-only invoicing</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
            {/* Create Button */}
            {!showCreateForm && !editingInvoice && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Invoice
              </Button>
            )}

            {/* Create Form */}
            {showCreateForm && (
              <InvoiceForm
                onInvoiceCreated={(invoice) => {
                  setInvoices((prev) => [invoice, ...prev]);
                  setShowCreateForm(false);
                  setSelectedInvoice(null);
                  toast.success("Invoice created successfully");
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            )}

            {/* Edit Form */}
            {editingInvoice && (
              <InvoiceForm
                editInvoice={editingInvoice}
                onInvoiceCreated={handleInvoiceUpdated}
                onCancel={() => setEditingInvoice(null)}
              />
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <Card variant="gradient">
                <CardContent className="p-8 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground">No invoices found</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first invoice to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              /* Invoices List */
              <div className="space-y-3">
                {invoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="relative">
                      <InvoiceCard
                        invoice={invoice}
                        isSelected={selectedInvoice === invoice._id}
                        onSelect={() =>
                          setSelectedInvoice(
                            selectedInvoice === invoice._id ? null : invoice._id
                          )
                        }
                        isOwner={true}
                        canDownloadPdf
                        onFinalize={handleFinalize}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />

                      {/* Download Button for Finalized Invoices */}
                      {selectedInvoice === invoice._id && invoice.status === "FINALIZED" && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3"
                        >
                          <Button
                            variant="outline"
                            className="w-full"
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
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Project Manager & Site Engineer view - read-only
  return (
    <MobileLayout role={role}>
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-2 sm:mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-base sm:text-lg">Invoices</h1>
              <p className="text-xs text-muted-foreground">View-only access</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="p-8 text-center">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No invoices found</p>
                <p className="text-sm text-muted-foreground">
                  No invoices are available for your assigned projects
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Invoices List - Read Only */
            <div className="space-y-3">
              {invoices.map((invoice, index) => (
                <motion.div
                  key={invoice._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <InvoiceCard
                    invoice={invoice}
                    isSelected={selectedInvoice === invoice._id}
                    onSelect={() =>
                      setSelectedInvoice(
                        selectedInvoice === invoice._id ? null : invoice._id
                      )
                    }
                    canDownloadPdf
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
