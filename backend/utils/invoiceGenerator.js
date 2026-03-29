const PDFDocument = require("pdfkit");

function generateInvoice(data, res) {
  const doc = new PDFDocument({ margin: 40 });

  // Set response headers for file download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_${data.invoiceNo}.pdf`);

  // Pipe PDF to response (instead of file)
  doc.pipe(res);

  // Header
  doc
    .fontSize(22)
    .text("MEDICAL STORE INVOICE", { align: "center" });

  doc.moveDown();

  // Store Info
  doc
    .fontSize(12)
    .text("PharmaCare Medical Store")
    .text("123 Health Avenue, Medical Road")
    .text("Phone: 9876543210")
    .text("GST No: 29ABCDE1234F2Z5");

  doc.moveDown();

  // Customer / Supplier Info
  doc.text(`Bill To: ${data.name || 'Walk-in Customer'}`);
  doc.text(`Phone: ${data.phone || 'N/A'}`);
  doc.text(`Date: ${data.date}`);
  doc.text(`Invoice No: ${data.invoiceNo}`);

  doc.moveDown();

  // Table Header
  const tableTop = 200;
  doc
    .fontSize(11)
    .text("Medicine", 50, tableTop)
    .text("Batch", 180, tableTop)
    .text("Expiry", 240, tableTop)
    .text("Qty", 300, tableTop)
    .text("Price", 340, tableTop)
    .text("GST%", 390, tableTop)
    .text("Total", 450, tableTop);

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 30;
  let subtotal = 0;

  data.items.forEach(item => {
    const total = item.qty * item.price;
    subtotal += total;

    doc
      .fontSize(10)
      .text(item.name, 50, y)
      .text(item.batch || 'N/A', 180, y)
      .text(item.expiry || 'N/A', 240, y)
      .text(item.qty.toString(), 300, y)
      .text(item.price.toFixed(2), 340, y)
      .text(item.gst || '12%', 390, y)
      .text(total.toFixed(2), 450, y);

    y += 20;
  });

  doc.moveDown(2);

  const tax = subtotal * 0.12;
  const grandTotal = subtotal + tax;

  doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 400, y);
  doc.text(`GST (12%): ₹${tax.toFixed(2)}`, 400, y + 20);
  doc.fontSize(14).text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 400, y + 45);

  // Footer
  doc.fontSize(10).text("Thank you for your purchase!", 50, 700, { align: "center" });

  doc.end();
}

module.exports = generateInvoice;

