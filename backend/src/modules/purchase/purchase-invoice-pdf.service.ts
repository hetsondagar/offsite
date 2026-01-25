import PDFDocument from 'pdfkit';
import { IPurchaseInvoice } from './purchase-invoice.model';

/**
 * Generate purchase invoice PDF with receipt photo if available
 */
export async function generatePurchaseInvoicePDFBuffer(
  invoice: IPurchaseInvoice
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('PURCHASE INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      // Invoice Number and Date
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, { align: 'left' });
      doc.text(`Date: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN')}`, {
        align: 'right',
      });
      doc.moveDown(1);

      // Project Details
      doc.fontSize(12).font('Helvetica-Bold').text('Project Details:', { continued: false });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Project: ${(invoice.projectId as any)?.name || 'N/A'}`);
      doc.text(`Location: ${(invoice.projectId as any)?.location || 'N/A'}`);
      doc.moveDown(1);

      // Material Details Table
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, tableTop);
      doc.text('Qty', 300, tableTop);
      doc.text('Unit', 350, tableTop);
      doc.text('Rate (₹)', 400, tableTop);
      doc.text('Amount (₹)', 500, tableTop, { align: 'right' });
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Material Item
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text(invoice.materialName, 50);
      doc.text(`${invoice.qty}`, 300);
      doc.text(invoice.unit, 350);
      doc.text(`${(invoice.basePrice / invoice.qty).toFixed(2)}`, 400);
      doc.text(`${invoice.basePrice.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Taxable Amount
      doc.text('Taxable Amount:', 50);
      doc.text(`₹${invoice.basePrice.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

      doc.moveDown(0.5);
      // GST
      doc.text(`GST (${invoice.gstRate}%):`, 50);
      doc.text(`₹${invoice.gstAmount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);

      // Total
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total Amount (₹):', 50);
      doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

      // GRN Details
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica');
      doc.text(`GRN Generated: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN')}`, 50);
      if (invoice.generatedBy) {
        doc.text(`Verified By: ${(invoice.generatedBy as any)?.name || 'N/A'}`, 50);
      }

      // Receipt Photo (if available)
      if (invoice.receiptPhotoUrl) {
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('Receipt Photo:', 50);
        doc.moveDown(0.5);
        
        try {
          // Try to load image from URL or local path
          // If it's a URL, we can't embed it directly in PDFKit
          // For now, just add a note that receipt photo is attached
          doc.fontSize(10).font('Helvetica');
          doc.text('Receipt photo is available in the system.', 50);
          doc.text(`Uploaded: ${invoice.receiptUploadedAt ? new Date(invoice.receiptUploadedAt).toLocaleDateString('en-IN') : 'N/A'}`, 50);
          if (invoice.receiptUploadedBy) {
            doc.text(`Uploaded By: ${(invoice.receiptUploadedBy as any)?.name || 'N/A'}`, 50);
          }
        } catch (error) {
          // If image loading fails, just skip it
          doc.fontSize(10).font('Helvetica');
          doc.text('Receipt photo available (unable to embed in PDF)', 50);
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
