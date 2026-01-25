import { Invoice } from '@/services/api/invoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { Receipt, MapPin, Calendar, DollarSign, CheckCircle2, Loader2, Edit2, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { invoicesApi } from '@/services/api/invoices';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useTranslation } from 'react-i18next';

interface InvoiceCardProps {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: () => void;
  onFinalize?: (invoiceId: string) => Promise<void>;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => Promise<void>;
  isOwner?: boolean;
  canDownloadPdf?: boolean;
}

export function InvoiceCard({ invoice, isSelected, onSelect, onFinalize, onEdit, onDelete, isOwner = false, canDownloadPdf = false }: InvoiceCardProps) {
  const { t } = useTranslation();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const navigate = useNavigate();

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

  const projectName =
    typeof invoice.projectId === 'object' ? invoice.projectId.name : t('materials.unknown') + ' ' + t('dpr.project');
  const projectLocation =
    typeof invoice.projectId === 'object' ? invoice.projectId.location : '';
  const projectId =
    typeof invoice.projectId === 'object' ? invoice.projectId._id : invoice.projectId;

  const handleFinalize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onFinalize) return;

    try {
      setIsFinalizing(true);
      await onFinalize(invoice._id);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(invoice);
    }
  };

  const handleProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete(invoice._id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      const doc = new jsPDF();
      const title = `Invoice ${invoice.invoiceNumber || invoice._id}`;
      doc.setFontSize(14);
      doc.text(title, 14, 16);

      doc.setFontSize(10);
      doc.text(`${t('dpr.project')}: ${projectName}`, 14, 26);
      if (projectLocation) {
        doc.text(`${t('projects.location')}: ${projectLocation}`, 14, 32);
      }
      doc.text(`${t('invoices.billingPeriod')}: ${formatDate(invoice.billingPeriod.from)} - ${formatDate(invoice.billingPeriod.to)}`, 14, 38);
      doc.text(`${t('invoices.gst')} ${t('common.details')}: ${invoice.gstType}`, 14, 44);

      const startY = 54;
      doc.text(t('invoices.totalAmount') + ' (INR)', 14, startY);
      const amounts = [
        [t('invoices.taxableAmount'), formatCurrency(invoice.taxableAmount)],
        [invoice.gstType === 'CGST_SGST' ? 'CGST+SGST' : 'IGST', formatCurrency(invoice.gstType === 'CGST_SGST' ? invoice.cgstAmount + invoice.sgstAmount : invoice.igstAmount)],
        [t('invoices.totalAmount'), formatCurrency(invoice.totalAmount)],
      ];
      amounts.forEach((row, idx) => {
        const y = startY + 8 + idx * 6;
        doc.text(row[0], 14, y);
        doc.text(row[1], 120, y, { align: 'right' });
      });

      doc.save(`${invoice.invoiceNumber || invoice._id}.pdf`);
      toast.success(t('invoices.gstInvoicePDFDownloaded'));
    } catch (error) {
      toast.error(t('invoices.failedToGeneratePDF'));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-300',
          'hover:border-primary/30 hover:shadow-glow-sm',
          isSelected && 'border-primary shadow-glow-md'
        )}
        onClick={onSelect}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4 text-primary" />
                <h3 className="font-display font-semibold text-foreground">
                  {invoice.invoiceNumber || `DRAFT-${invoice._id.slice(-6)}`}
                </h3>
              </div>
              <button
                onClick={handleProjectClick}
                className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors"
              >
                <MapPin className="w-3 h-3" />
                <span className="hover:underline">{projectName}</span>
              </button>
              {projectLocation && (
                <p className="text-xs text-muted-foreground ml-4">{projectLocation}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end">
              {invoice.status !== 'DRAFT' && (
                <span
                  className={cn(
                    'px-2 py-1 rounded-md text-xs font-medium',
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  )}
                >
                  {invoice.status}
                </span>
              )}
              {invoice.paymentStatus !== 'UNPAID' && (
                <span
                  className={cn(
                    'px-2 py-1 rounded-md text-xs font-medium',
                    invoice.paymentStatus === 'PAID'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  )}
                >
                  {invoice.paymentStatus.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          {/* Amount Summary */}
          <div className="flex items-center justify-between text-sm mb-3 p-2 rounded-lg bg-muted/50">
            <div className="text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">
                  {formatDate(invoice.billingPeriod.from)} - {formatDate(invoice.billingPeriod.to)}
                </span>
              </div>
              <p className="text-xs mt-1">
                {t('invoices.taxableAmount')}: {formatCurrency(invoice.taxableAmount)}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <DollarSign className="w-4 h-4 text-primary" />
                <p className="font-display font-bold text-lg text-foreground">
                  {formatCurrency(invoice.totalAmount)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {invoice.gstType === 'CGST_SGST'
                  ? `CGST+SGST: ${formatCurrency(invoice.cgstAmount + invoice.sgstAmount)}`
                  : `IGST: ${formatCurrency(invoice.igstAmount)}`}
              </p>
            </div>
          </div>

          {/* Expanded Details */}
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border/50 space-y-4"
            >
              {/* Supplier & Client Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Supplier</h4>
                  <p className="text-sm font-medium text-foreground">{invoice.supplier.companyName}</p>
                  <p className="text-xs text-muted-foreground">{invoice.supplier.address}</p>
                  <p className="text-xs text-muted-foreground">GSTIN: {invoice.supplier.gstin}</p>
                  <p className="text-xs text-muted-foreground">State: {invoice.supplier.state}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('invoices.client')}</h4>
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
                    <span className="text-muted-foreground">{t('invoices.taxableAmount')}</span>
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
                    <span className="font-semibold text-foreground">{t('invoices.totalAmount')}</span>
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

              {/* Finalization Info */}
              {invoice.status === 'FINALIZED' && invoice.finalizedAt && (
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground mb-1">Finalized</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(invoice.finalizedAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}

              {/* Owner Actions */}
              {isOwner && invoice.status === 'DRAFT' && (
                <div className="flex flex-wrap gap-2 w-full">
                  {onEdit && (
                    <Button
                      onClick={handleEdit}
                      variant="outline"
                      className="flex-1 min-w-0 sm:min-w-[120px]"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      {t('common.edit')}
                    </Button>
                  )}
                  {onFinalize && (
                    <Button
                      onClick={handleFinalize}
                      disabled={isFinalizing}
                      className="flex-1 min-w-0 sm:min-w-[120px]"
                    >
                      {isFinalizing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Finalize
                        </>
                      )}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      onClick={handleDeleteClick}
                      variant="destructive"
                      disabled={isDeleting}
                      className="flex-1 min-w-0 sm:min-w-[120px]"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('common.delete')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {canDownloadPdf && (
                <div className="flex flex-wrap gap-2 w-full">
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                    variant="outline"
                    className="flex-1 min-w-0 sm:min-w-[160px]"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Preparing PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        {t('invoices.downloadGSTInvoicePDF')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice{' '}
              <span className="font-semibold">{invoice.invoiceNumber || `DRAFT-${invoice._id.slice(-6)}`}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(false);
              }}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('invoices.deleting')}
                </>
              ) : (
                t('invoices.deleteInvoice')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
