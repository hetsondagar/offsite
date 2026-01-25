import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { purchaseInvoiceApi, PurchaseInvoice } from '@/services/api/purchase';
import { Receipt, Download, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';

export default function PurchaseInvoicesPage() {
  const { role } = useAppSelector((state) => state.auth);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await purchaseInvoiceApi.getInvoices();
      setInvoices(data?.invoices || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      setDownloadingId(invoiceId);
      const blob = await purchaseInvoiceApi.downloadPDF(invoiceId);
      const invoice = invoices.find((inv) => inv._id === invoiceId);
      const filename = invoice?.invoiceNumber
        ? `Purchase-Invoice-${invoice.invoiceNumber}.pdf`
        : `Purchase-Invoice-${invoiceId}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <MobileLayout role={role as any || 'manager'}>
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">Purchase Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and export purchase invoices generated after GRN verification
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoices ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No purchase invoices yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Invoices are generated automatically after engineers verify materials with GRN
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {invoice.invoiceNumber}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {invoice.projectId?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Generated: {formatDate(invoice.generatedAt)}
                        </p>
                      </div>
                      <StatusBadge status="success" label="VERIFIED" />
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <p>📦 Material: {invoice.materialName}</p>
                      <p>📊 Quantity: {invoice.qty} {invoice.unit}</p>
                      <p>💰 Taxable: {formatCurrency(invoice.basePrice)}</p>
                      <p>📊 GST ({invoice.gstRate}%): {formatCurrency(invoice.gstAmount)}</p>
                      <p className="font-semibold text-foreground text-base mt-2">
                        Total: {formatCurrency(invoice.totalAmount)}
                      </p>
                    </div>

                    {invoice.generatedBy && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Verified by: {invoice.generatedBy?.name || 'N/A'}
                      </p>
                    )}

                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleDownloadPDF(invoice._id)}
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
                          Export PDF
                        </>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
