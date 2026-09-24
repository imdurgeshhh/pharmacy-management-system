import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getShopProfile } from '../config/shop';
import { numberToWords } from './numberToWords';

const fmt = (n) => `Rs. ${(Number(n) || 0).toFixed(2)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Generates and downloads a PDF invoice for POS retail checkout.
 * Auto-fetches store details from the DB / shop profile.
 * Fixes ₹ symbol bug by using standard 'Rs.' (compatible with standard PDF Helvetica).
 * Opens preview in new tab to prevent ERR_FAILED local file issues, and triggers save.
 */
export function generateInvoicePDF(
  customer = {},
  rows = [],
  summary = {},
  paymentMode = 'Cash',
  bNo = '',
  shop = getShopProfile()
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;

  const shopName = shop?.name || 'PHARMACY STORE';
  const shopAddress = shop?.address || '';
  const shopDlNo = shop?.dl_no || '';
  const shopGstin = shop?.gstin || '';
  const shopPhone = shop?.phone || '';
  const shopEmail = shop?.email || '';
  const pharmacistName = shop?.pharmacist_name || '';
  const pharmacistRegNo = shop?.pharmacist_reg_no || '';

  // 1. Header Banner
  doc.setFillColor(46, 125, 50);
  const bannerHeight = shopDlNo ? 76 : 65;
  doc.rect(0, 0, W, bannerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(shopName, W / 2, 22, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(shopAddress, W / 2, 34, { align: 'center' });

  // Only display GSTIN / Phone if non-empty; avoid ugly 'GSTIN: —' when real data exists
  const contactParts = [];
  if (shopGstin) contactParts.push(`GSTIN: ${shopGstin}`);
  if (shopPhone) contactParts.push(`Ph: ${shopPhone}`);
  if (shopEmail) contactParts.push(`Email: ${shopEmail}`);
  const contactLine = contactParts.length > 0 ? contactParts.join('  |  ') : (shopDlNo ? '' : 'TAX INVOICE');

  if (contactLine) {
    doc.text(contactLine, W / 2, 45, { align: 'center' });
  }

  if (shopDlNo) {
    doc.text(`D.L. No.: ${shopDlNo}`, W / 2, 56, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TAX INVOICE', W / 2, bannerHeight - 6, { align: 'center' });

  // 2. Customer & Bill Details
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(8);
  const startY = bannerHeight + 15;
  let curLeftY = startY;

  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 40, curLeftY);
  curLeftY += 12;

  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${customer.name || 'Walk-in Customer'}`, 40, curLeftY);
  curLeftY += 12;
  doc.text(`Phone: ${customer.phone || '—'}`, 40, curLeftY);
  curLeftY += 12;

  if (customer.address) {
    doc.text(`Address: ${customer.address}`, 40, curLeftY);
    curLeftY += 12;
  }
  if (customer.gst) {
    doc.text(`GST: ${customer.gst}`, 40, curLeftY);
    curLeftY += 12;
  }
  if (customer.doctor) {
    doc.text(`Doctor: Dr. ${customer.doctor}`, 40, curLeftY);
    curLeftY += 12;
  }
  if (customer.prescription) {
    doc.text(`Rx No.: ${customer.prescription}`, 40, curLeftY);
    curLeftY += 12;
  }

  let curRightY = startY;
  doc.setFont('helvetica', 'bold');
  doc.text(`Bill No: ${bNo}`, W - 40, curRightY, { align: 'right' });
  curRightY += 12;
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${customer.bill_date || todayStr()}`, W - 40, curRightY, { align: 'right' });
  curRightY += 12;
  doc.text(`Payment: ${paymentMode}`, W - 40, curRightY, { align: 'right' });
  curRightY += 12;

  const tableY = Math.max(curLeftY, curRightY) + 6;

  // 3. Medicine Items Table
  autoTable(doc, {
    startY: tableY,
    head: [['#', 'Medicine', 'HSN', 'Qty', 'MRP', 'Disc%', 'Disc Amt', 'GST%', 'Tax Amt', 'Net Amt']],
    body: rows.map((r, i) => [
      i + 1,
      r.name || r.particulars || r.medicine_name || 'Medicine',
      r.hsn_code || r.hsn || '3004',
      r.qty,
      fmt(r.mrp),
      `${r.disc_pct || 0}%`,
      fmt(r.disc_amt),
      `${r.gst_pct || 0}%`,
      fmt(r.tax_amt),
      fmt(r.net_amt)
    ]),
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [240, 255, 240] },
    styles: { cellPadding: 3 },
  });

  // 4. Summary & Tax Breakup Box
  const fy = (doc.lastAutoTable?.finalY || tableY + 50) + 10;
  const rX = W - 40;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);

  let sumY = fy + 12;
  doc.text('Subtotal:', rX - 100, sumY, { align: 'right' });
  doc.text(fmt(summary.subtotal), rX, sumY, { align: 'right' });
  sumY += 12;

  doc.text('Discount:', rX - 100, sumY, { align: 'right' });
  doc.text(`- ${fmt(summary.totalDiscount)}`, rX, sumY, { align: 'right' });
  sumY += 12;

  // CGST / SGST vs IGST
  const totalGST = Number(summary.totalGST) || 0;
  const storeState = shopGstin ? String(shopGstin).trim().slice(0, 2) : '';
  const customerState = customer.gst ? String(customer.gst).trim().slice(0, 2) : '';
  const isInterState = Boolean(storeState && customerState && storeState !== customerState);

  if (isInterState) {
    doc.text('IGST:', rX - 100, sumY, { align: 'right' });
    doc.text(fmt(totalGST), rX, sumY, { align: 'right' });
    sumY += 12;
  } else {
    const halfGst = totalGST / 2;
    doc.text('CGST:', rX - 100, sumY, { align: 'right' });
    doc.text(fmt(halfGst), rX, sumY, { align: 'right' });
    sumY += 12;
    doc.text('SGST:', rX - 100, sumY, { align: 'right' });
    doc.text(fmt(halfGst), rX, sumY, { align: 'right' });
    sumY += 12;
  }

  if (summary.roundOff_amt) {
    doc.text('Round Off:', rX - 100, sumY, { align: 'right' });
    doc.text(fmt(summary.roundOff_amt), rX, sumY, { align: 'right' });
    sumY += 12;
  }

  // Grand Total Highlight
  doc.setFillColor(46, 125, 50);
  doc.roundedRect(rX - 150, sumY, 152, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Grand Total: ${fmt(summary.grandTotal)}`, rX - 74, sumY + 13, { align: 'center' });

  // 5. Amount in Words (on the left side across from summary)
  const amountWords = numberToWords(summary.grandTotal || 0);
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in Words:', 40, fy + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(amountWords, 40, fy + 24, { maxWidth: W - 230 });

  // 6. Dispensed By / Pharmacist Signatory
  const signatoryY = sumY + 35;
  if (pharmacistName || pharmacistRegNo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const signText = `Dispensed by: ${pharmacistName || 'Registered Pharmacist'}${pharmacistRegNo ? ` | Reg No: ${pharmacistRegNo}` : ''}`;
    doc.text(signText, 40, signatoryY);
  }

  // 7. Footer Policies & Greetings
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');

  const footerBottom = H - 18;
  const hasSchedule = rows.some(r => r.schedule === 'H' || r.schedule === 'H1' || r.schedule === 'X');
  if (hasSchedule) {
    doc.text('Notice: Schedule H/H1/X drugs to be sold on prescription of Registered Medical Practitioner only.', W / 2, footerBottom - 20, { align: 'center' });
  }
  doc.text('Terms: Medicines without valid prescription will not be accepted back. Keep medicines out of reach of children.', W / 2, footerBottom - 10, { align: 'center' });
  doc.text('Thank you! Get well soon! Computer-generated invoice.', W / 2, footerBottom, { align: 'center' });

  // Open in browser tab via Blob URL to avoid Chrome file:/// ERR_FAILED, and trigger file download
  if (typeof doc.output === 'function' && typeof window !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (_) {}
  }

  doc.save(`Invoice_${bNo || 'bill'}.pdf`);
}

export default generateInvoicePDF;
