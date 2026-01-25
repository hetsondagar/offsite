import { useState, useEffect, useRef } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { purchaseInvoiceApi, PurchaseInvoice } from '@/services/api/purchase';
import { Receipt, Download, Loader2, FileText, Upload, Camera, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAppSelector } from '@/store/hooks';
import { takePhoto } from '@/lib/capacitor-camera';

export default function PurchaseInvoicesPage() {
  const { role } = useAppSelector((state) => state.auth);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadReceipt = async (invoiceId: string) => {
    try {
      setUploadingId(invoiceId);
      
      // Take photo using Capacitor camera
      const photoUrl = await takePhoto();
      if (!photoUrl) {
        toast.error('Photo capture cancelled');
        return;
      }

      // Convert data URL to File
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });

      // Upload receipt and send PDF
      await purchaseInvoiceApi.uploadReceiptAndSend(invoiceId, file);
      
      toast.success('Receipt uploaded and invoice PDF sent successfully!');
      loadInvoices(); // Reload to show updated status
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload receipt');
    } finally {
      setUploadingId(null);
    }
  };

  const pendingInvoices = invoices.filter(inv => !inv.receiptPhotoUrl);
  const completedInvoices = invoices.filter(inv => inv.receiptPhotoUrl);

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
            {role === 'purchase_manager' 
              ? 'Upload receipt photos and send invoices to Project Managers and Owners'
              : 'View and export purchase invoices generated after GRN verification'}
          </p>
        </motion.div>

        {role === 'purchase_manager' && pendingInvoices.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <Upload className="w-5 h-5" />
                Pending Receipt Upload ({pendingInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingInvoices.map((invoice, index) => (
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
                      <StatusBadge status="warning" label="PENDING" />
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <p>📦 Material: {invoice.materialName}</p>
                      <p>📊 Quantity: {invoice.qty} {invoice.unit}</p>
                      <p className="font-semibold text-foreground text-base mt-2">
                        Total: {formatCurrency(invoice.totalAmount)}
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleUploadReceipt(invoice._id)}
                      disabled={uploadingId === invoice._id}
                    >
                      {uploadingId === invoice._id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Receipt & Send PDF
                        </>
                      )}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {role === 'purchase_manager' ? 'Completed Invoices' : 'Invoices'} ({role === 'purchase_manager' ? completedInvoices.length : invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (role === 'purchase_manager' ? completedInvoices : invoices).length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {role === 'purchase_manager' ? 'No completed invoices yet' : 'No purchase invoices yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {role === 'purchase_manager' 
                    ? 'Upload receipt photos to complete invoices'
                    : 'Invoices are generated automatically after engineers verify materials with GRN'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(role === 'purchase_manager' ? completedInvoices : invoices).map((invoice, index) => (
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
                      <StatusBadge 
                        status={invoice.receiptPhotoUrl ? "success" : "warning"} 
                        label={invoice.receiptPhotoUrl ? "COMPLETED" : "PENDING"} 
                      />
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

                    {invoice.receiptPhotoUrl && (
                      <div className="mb-3 p-2 bg-green-50 dark:bg-green-950 rounded flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-800 dark:text-green-200">
                          Receipt uploaded {invoice.receiptUploadedAt ? formatDate(invoice.receiptUploadedAt) : ''}
                        </span>
                      </div>
                    )}

                    {invoice.generatedBy && (
                      <p className="text-xs text-muted-foreground mb-3">
                        Verified by: {invoice.generatedBy?.name || 'N/A'}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {role === 'purchase_manager' && !invoice.receiptPhotoUrl && (
                        <Button
                          className="flex-1"
                          onClick={() => handleUploadReceipt(invoice._id)}
                          disabled={uploadingId === invoice._id}
                        >
                          {uploadingId === invoice._id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 mr-2" />
                              Upload Receipt
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        className={role === 'purchase_manager' && !invoice.receiptPhotoUrl ? "flex-1" : "w-full"}
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
                    </div>
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
