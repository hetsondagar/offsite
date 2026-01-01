import PDFDocument from 'pdfkit';
import { IInvoice } from './invoice.model';

/**
 * Generate GST-compliant invoice PDF.
 * Server-side only generation for legal compliance.
 */
export async function generateInvoicePDF(invoice: IInvoice): Promise<Buffer> {
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
      doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      // Invoice Number and Date
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoiceNumber || 'DRAFT'}`, { align: 'left' });
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, {
        align: 'right',
      });
      doc.moveDown(1);

      // Supplier Details (Left)
      doc.fontSize(12).font('Helvetica-Bold').text('From (Supplier):', { continued: false });
      doc.fontSize(10).font('Helvetica');
      doc.text(invoice.supplier.companyName);
      doc.text(invoice.supplier.address);
      doc.text(`GSTIN: ${invoice.supplier.gstin}`);
      doc.text(`State: ${invoice.supplier.state}`);

      // Client Details (Right)
      const clientY = doc.y;
      doc.fontSize(12).font('Helvetica-Bold').text('To (Client):', {
        align: 'right',
        continued: false,
      });
      doc.fontSize(10).font('Helvetica');
      doc.text(invoice.client.name, { align: 'right' });
      doc.text(invoice.client.address, { align: 'right' });
      if (invoice.client.gstin) {
        doc.text(`GSTIN: ${invoice.client.gstin}`, { align: 'right' });
      }
      doc.text(`State: ${invoice.client.state}`, { align: 'right' });

      doc.y = Math.max(doc.y, clientY) + 20;
      doc.moveDown(1);

      // Project Details
      doc.fontSize(10).font('Helvetica');
      doc.text(`Project: ${(invoice.projectId as any)?.name || 'N/A'}`);
      doc.text(
        `Billing Period: ${new Date(invoice.billingPeriod.from).toLocaleDateString('en-IN')} to ${new Date(invoice.billingPeriod.to).toLocaleDateString('en-IN')}`
      );
      doc.moveDown(1);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, tableTop);
      doc.text('Amount (₹)', 450, tableTop, { align: 'right' });
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Taxable Amount
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text('Taxable Amount (as per approved DPRs, tasks, and materials)', 50);
      doc.text(invoice.taxableAmount.toFixed(2), 450, doc.y - 12, { align: 'right' });

      // GST Breakdown
      doc.moveDown(0.5);
      if (invoice.gstType === 'CGST_SGST') {
        doc.text(`CGST (${(invoice.gstRate / 2).toFixed(2)}%)`, 50);
        doc.text(invoice.cgstAmount.toFixed(2), 450, doc.y - 12, { align: 'right' });
        doc.moveDown(0.3);
        doc.text(`SGST (${(invoice.gstRate / 2).toFixed(2)}%)`, 50);
        doc.text(invoice.sgstAmount.toFixed(2), 450, doc.y - 12, { align: 'right' });
      } else {
        doc.text(`IGST (${invoice.gstRate.toFixed(2)}%)`, 50);
        doc.text(invoice.igstAmount.toFixed(2), 450, doc.y - 12, { align: 'right' });
      }

      // Total
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total Amount (₹)', 50);
      doc.text(invoice.totalAmount.toFixed(2), 450, doc.y - 14, { align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

      // Payment Status
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Payment Status: ${invoice.paymentStatus}`, 50);

      // Notes
      if (invoice.notes) {
        doc.moveDown(1);
        doc.text(`Notes: ${invoice.notes}`, 50);
      }

      // Footer
      doc.fontSize(8).font('Helvetica');
      const footerY = 750;
      doc.text('GST-compliant invoice generated via OffSite', 50, footerY, {
        align: 'center',
      });

      doc.end();
    } catch (error: any) {
      reject(error);
    }
  });
}

