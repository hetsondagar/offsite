import PDFDocument from 'pdfkit';
import { IContractorInvoice } from './contractor-invoice.model';

/**
 * Generate contractor invoice PDF
 */
export async function generateContractorInvoicePDFBuffer(
  invoice: IContractorInvoice
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
      doc.fontSize(20).font('Helvetica-Bold').text('CONTRACTOR INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      // Invoice Number and Date
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${invoice.invoiceNumber || 'N/A'}`, { align: 'left' });
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, {
        align: 'right',
      });
      doc.moveDown(1);

      // Project Details
      doc.fontSize(12).font('Helvetica-Bold').text('Project Details:', { continued: false });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Project: ${(invoice.projectId as any)?.name || 'N/A'}`);
      doc.text(`Location: ${(invoice.projectId as any)?.location || 'N/A'}`);
      doc.moveDown(1);

      // Contractor Details
      doc.fontSize(12).font('Helvetica-Bold').text('Contractor Details:', { continued: false });
      doc.fontSize(10).font('Helvetica');
      const contractor = invoice.contractorId as any;
      if (contractor?.userId) {
        const contractorUser = contractor.userId as any;
        doc.text(`Name: ${contractorUser?.name || 'N/A'}`);
        doc.text(`Phone: ${contractorUser?.phone || 'N/A'}`);
      }
      doc.moveDown(1);

      // Period Details
      doc.fontSize(12).font('Helvetica-Bold').text('Billing Period:', { continued: false });
      doc.fontSize(10).font('Helvetica');
      doc.text(`From: ${new Date(invoice.weekStartDate).toLocaleDateString('en-IN')}`);
      doc.text(`To: ${new Date(invoice.weekEndDate).toLocaleDateString('en-IN')}`);
      doc.moveDown(1);

      // Labour Details Table
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, tableTop);
      doc.text('Qty', 300, tableTop);
      doc.text('Rate (₹)', 400, tableTop);
      doc.text('Amount (₹)', 500, tableTop, { align: 'right' });
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Labour Item
      doc.moveDown(0.5);
      doc.font('Helvetica');
      doc.text('Labour Days', 50);
      doc.text(`${invoice.labourCountTotal}`, 300);
      doc.text(`${invoice.ratePerLabour.toFixed(2)}`, 400);
      doc.text(`${invoice.taxableAmount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Taxable Amount
      doc.text('Taxable Amount:', 50);
      doc.text(`₹${invoice.taxableAmount.toFixed(2)}`, 500, doc.y - 12, { align: 'right' });

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

      // Approval Details
      if (invoice.status === 'APPROVED' && invoice.approvedAt) {
        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Approved: ${new Date(invoice.approvedAt).toLocaleDateString('en-IN')}`, 50);
        if (invoice.approvedBy) {
          doc.text(`Approved By: ${(invoice.approvedBy as any)?.name || 'N/A'}`, 50);
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
