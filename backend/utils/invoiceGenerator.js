const PDFDocument = require("pdfkit");
const numberToWords = require("./numberToWords");

/**
 * Generates an Estimate / Invoice PDF matching the Kunal Medical Agency format.
 * Uses pdfkit.
 */
function generateInvoice(data, res) {
  // A4 size: 595.28 x 841.89 points
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: true
  });

  const invoiceNo = data.invoiceNo || 'SM000001';
  const filename = `invoice_${invoiceNo}.pdf`;

  if (res) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    doc.pipe(res);
  }

  const store = data.store || {};
  const shopName = (store.shop_name || '').toUpperCase();
  const shopAddress = (store.address || '').toUpperCase();
  const dlNo = store.dl_no || '';
  const panNo = store.pan_no || '';
  const aadharNo = store.aadhar_no || '';
  const foodLicNo = store.food_lic_no || '';

  // Invoice metadata
  const docTitle = (data.title || 'ESTIMATE ORDER').toUpperCase();
  const subTitle = (data.subTitle || 'ROUGH ESTIMATE').toUpperCase();
  const paymentMode = (data.paymentMode || 'CREDIT').toUpperCase();
  const dateStr = data.date || new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const eInvoice = data.eInvoice || '';
  const cashier = data.cashier || data.userName || '';
  const oldBalance = parseFloat(data.oldBalance || data.credit_balance || 0).toFixed(2);

  // Items processing
  const items = Array.isArray(data.items) ? data.items : [];
  let totalUnits = 0;
  let subTotalCalc = 0;
  let totalScheme = parseFloat(data.scheme_amount || 0);
  let totalDiscount = parseFloat(data.discount_amount || 0);

  const formattedItems = items.map((it) => {
    const qty = parseFloat(it.qty) || 0;
    const freeQty = parseFloat(it.free_qty || it.freeQty || 0);
    const mrp = parseFloat(it.mrp || it.price || 0);
    const oldMrp = parseFloat(it.old_mrp || it.oldMrp || 0);
    const trRate = parseFloat(it.trade_rate || it.tradeRate || it.price || mrp);
    const schPct = parseFloat(it.scheme_pct || it.sch_pct || 0);
    const discPct = parseFloat(it.discount_pct || it.disc_pct || 0);

    // Net rate calculation
    let netRate = parseFloat(it.net_rate || it.netRate || 0);
    if (!netRate) {
      const afterSch = trRate * (1 - schPct / 100);
      netRate = +(afterSch * (1 - discPct / 100)).toFixed(2);
    }

    // Net total
    let netTotal = parseFloat(it.net_total || it.netTotal || 0);
    if (!netTotal) {
      netTotal = +(netRate * qty).toFixed(2);
    }

    totalUnits += (qty + freeQty);
    subTotalCalc += netTotal;

    // Expiry formatting: expect MM/YY or YYYY-MM-DD
    let expFormatted = it.expiry || it.exp || '';
    if (expFormatted.includes('-') && expFormatted.length >= 7) {
      const parts = expFormatted.split('-');
      if (parts[0].length === 4) {
        expFormatted = `${parts[1]}/${parts[0].slice(-2)}`;
      } else if (parts[2]?.length === 4) {
        expFormatted = `${parts[1]}/${parts[2].slice(-2)}`;
      }
    }

    return {
      oldMrp: oldMrp ? oldMrp.toFixed(2) : '0.00',
      hsn: it.hsn_code || it.hsn || '3004',
      particulars: (it.name || it.medicine_name || 'Medicine').toUpperCase(),
      pack: (it.pack || it.pack_size || '1').toUpperCase(),
      batch: (it.batch || it.batch_number || 'N/A').toUpperCase(),
      exp: expFormatted || 'N/A',
      mrp: mrp.toFixed(2),
      qtyFr: freeQty > 0 ? `${qty}+${freeQty}` : `${qty}`,
      trRate: trRate.toFixed(2),
      schPct: schPct.toFixed(2),
      discPct: discPct.toFixed(2),
      netRate: netRate.toFixed(2),
      netTotal: netTotal.toFixed(2)
    };
  });

  const subTotal = parseFloat(data.subTotal || data.sub_total || subTotalCalc);
  const crDr = parseFloat(data.cr_dr_amount || 0);
  const freight = parseFloat(data.freight_amount || 0);
  const roundOff = parseFloat(data.round_off || 0);
  const grandTotal = parseFloat(data.grandTotal || data.total_amount || (subTotal - totalScheme - totalDiscount + crDr + freight + roundOff));
  const wordsStr = numberToWords(grandTotal);

  // ── Coordinates & Geometry ───────────────────────────────────────────────
  const leftX = 20;
  const rightX = 575;
  const tableWidth = rightX - leftX; // 555 pt
  const topY = 20;

  // Column definitions: width & offset from leftX
  // Total widths must equal 555
  const cols = [
    { id: 'oldMrp',      name: 'OLD.MRP',     w: 38, align: 'right'  },
    { id: 'hsn',         name: 'HSN',         w: 46, align: 'center' },
    { id: 'particulars', name: 'Particulars', w: 122, align: 'left'   },
    { id: 'pack',        name: 'Pack',        w: 34, align: 'center' },
    { id: 'batch',       name: 'Batch',       w: 48, align: 'center' },
    { id: 'exp',         name: 'Exp',         w: 32, align: 'center' },
    { id: 'mrp',         name: 'MRP',         w: 36, align: 'right'  },
    { id: 'qtyFr',       name: 'Qty+Fr',      w: 34, align: 'center' },
    { id: 'trRate',      name: 'Tr.Rate',     w: 36, align: 'right'  },
    { id: 'schPct',      name: 'Sch%',        w: 26, align: 'right'  },
    { id: 'discPct',     name: 'Disc%',       w: 26, align: 'right'  },
    { id: 'netRate',     name: 'NET RATE',    w: 36, align: 'right'  },
    { id: 'netTotal',    name: 'Net Total',   w: 41, align: 'right'  },
  ];

  // Calculate cumulative X offsets
  let currX = leftX;
  cols.forEach(c => {
    c.x = currX;
    currX += c.w;
  });

  // Section Heights
  const headerH = 56;
  const metaH = 32;
  const thH = 16;
  const rowH = 14;
  const minTableH = 340;
  const contentTableH = Math.max(minTableH, formattedItems.length * rowH + 20);

  const headerY = topY;
  const metaY = headerY + headerH;
  const tableHeaderY = metaY + metaH;
  const tableBodyY = tableHeaderY + thH;
  const tableBottomY = tableBodyY + contentTableH;
  const summaryH = 70;
  const summaryBottomY = tableBottomY + summaryH;
  const footerH = 24;
  const footerBottomY = summaryBottomY + footerH;

  // Draw Outer Border
  doc.lineWidth(1).strokeColor('#000000');
  doc.rect(leftX, headerY, tableWidth, footerBottomY - headerY).stroke();

  // ── 1. HEADER SECTION ────────────────────────────────────────────────────
  // Horizontal divider at bottom of header
  doc.moveTo(leftX, metaY).lineTo(rightX, metaY).stroke();

  // Left Title
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
  doc.text(docTitle, leftX + 8, headerY + 12);
  
  if (data.customerName && data.customerName !== 'Walk-in Customer') {
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text(`Customer: ${data.customerName} (${data.customerPhone || '—'})`, leftX + 8, headerY + 36);
  }

  // Vertical line separating header left & right
  const headerSplitX = 310;
  doc.moveTo(headerSplitX, headerY).lineTo(headerSplitX, metaY).stroke();

  // Right Shop Details
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
  doc.text(`M/s: ${shopName}`, headerSplitX + 6, headerY + 6, { width: rightX - headerSplitX - 10 });

  doc.font('Helvetica').fontSize(7.5);
  doc.text(shopAddress, headerSplitX + 6, headerY + 18);

  doc.fontSize(7);
  doc.text(`DL.NO. ${dlNo}`, headerSplitX + 6, headerY + 30);
  doc.text(`PAN : ${panNo}, AADHAR : ${aadharNo}`, headerSplitX + 6, headerY + 42);

  // ── 2. META ROW SECTION ──────────────────────────────────────────────────
  // Horizontal divider at bottom of meta
  doc.moveTo(leftX, tableHeaderY).lineTo(rightX, tableHeaderY).stroke();

  const metaSplit1 = 230;
  const metaSplit2 = 365;

  // Split lines
  doc.moveTo(metaSplit1, metaY).lineTo(metaSplit1, tableHeaderY).stroke();
  doc.moveTo(metaSplit2, metaY).lineTo(metaSplit2, tableHeaderY).stroke();

  // Left: Food Lic NO
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
  doc.text(`Food Lic NO : ${foodLicNo}`, leftX + 6, metaY + 10);

  // Center: ROUGH ESTIMATE / CREDIT
  doc.font('Helvetica-Bold').fontSize(8.5);
  doc.text(subTitle, metaSplit1, metaY + 5, { width: metaSplit2 - metaSplit1, align: 'center' });
  doc.fontSize(9);
  doc.text(paymentMode, metaSplit1, metaY + 17, { width: metaSplit2 - metaSplit1, align: 'center' });

  // Right: Estimate No / e-Invoice / Date
  doc.font('Helvetica-Bold').fontSize(7.5);
  doc.text(`Estimate No. : ${invoiceNo}`, metaSplit2 + 6, metaY + 4);
  doc.font('Helvetica').fontSize(7.5);
  doc.text(`e-Invoice : ${eInvoice}`, metaSplit2 + 6, metaY + 13);
  doc.font('Helvetica-Bold');
  doc.text(`Date : ${dateStr}`, rightX - 95, metaY + 4, { width: 90, align: 'right' });

  // ── 3. TABLE HEADER ROW ──────────────────────────────────────────────────
  // Horizontal line under table header
  doc.moveTo(leftX, tableBodyY).lineTo(rightX, tableBodyY).stroke();

  // Background tint for header
  doc.rect(leftX, tableHeaderY, tableWidth, thH).fillColor('#e8e8e8').fill();

  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000000');
  cols.forEach(c => {
    const pad = 2;
    doc.text(c.name, c.x + pad, tableHeaderY + 4, { width: c.w - (pad * 2), align: c.align });
  });

  // ── 4. TABLE BODY & VERTICAL COLUMN LINES ────────────────────────────────
  // Draw vertical lines extending from tableHeaderY all the way down to tableBottomY
  cols.forEach((c, idx) => {
    if (idx > 0) {
      doc.moveTo(c.x, tableHeaderY).lineTo(c.x, tableBottomY).stroke();
    }
  });

  // Render Items
  let rowY = tableBodyY + 4;
  doc.font('Helvetica').fontSize(6.8).fillColor('#000000');

  formattedItems.forEach(it => {
    const pad = 2;
    doc.text(it.oldMrp,      cols[0].x + pad,  rowY, { width: cols[0].w - pad * 2, align: cols[0].align });
    doc.text(it.hsn,         cols[1].x + pad,  rowY, { width: cols[1].w - pad * 2, align: cols[1].align });
    doc.text(it.particulars, cols[2].x + pad,  rowY, { width: cols[2].w - pad * 2, align: cols[2].align, ellipsis: true });
    doc.text(it.pack,        cols[3].x + pad,  rowY, { width: cols[3].w - pad * 2, align: cols[3].align });
    doc.text(it.batch,       cols[4].x + pad,  rowY, { width: cols[4].w - pad * 2, align: cols[4].align });
    doc.text(it.exp,         cols[5].x + pad,  rowY, { width: cols[5].w - pad * 2, align: cols[5].align });
    doc.text(it.mrp,         cols[6].x + pad,  rowY, { width: cols[6].w - pad * 2, align: cols[6].align });
    doc.text(it.qtyFr,       cols[7].x + pad,  rowY, { width: cols[7].w - pad * 2, align: cols[7].align });
    doc.text(it.trRate,      cols[8].x + pad,  rowY, { width: cols[8].w - pad * 2, align: cols[8].align });
    doc.text(it.schPct,      cols[9].x + pad,  rowY, { width: cols[9].w - pad * 2, align: cols[9].align });
    doc.text(it.discPct,     cols[10].x + pad, rowY, { width: cols[10].w - pad * 2, align: cols[10].align });
    doc.text(it.netRate,     cols[11].x + pad, rowY, { width: cols[11].w - pad * 2, align: cols[11].align });
    doc.text(it.netTotal,    cols[12].x + pad, rowY, { width: cols[12].w - pad * 2, align: cols[12].align });

    rowY += rowH;
  });

  // ── 5. TOTALS & SUMMARY SECTION ──────────────────────────────────────────
  // Horizontal line closing the table body
  doc.moveTo(leftX, tableBottomY).lineTo(rightX, tableBottomY).stroke();

  // Vertical divider between Left (Total Qty/Items) and Right Summary Box
  const summarySplitX = 425;
  doc.moveTo(summarySplitX, tableBottomY).lineTo(summarySplitX, summaryBottomY).stroke();

  // Left: TOTAL qty ITEMS (count)
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#000000');
  doc.text(
    `TOTAL   ${totalUnits.toFixed(1)}   ITEMS (${formattedItems.length})`,
    leftX + 240,
    tableBottomY + 4,
    { width: summarySplitX - leftX - 245, align: 'right' }
  );

  // Right summary breakdown
  const sumLines = [
    { label: 'SUB TOTAL',   val: subTotal.toFixed(2), isBold: false },
    { label: 'Scheme',      val: totalScheme.toFixed(2), isBold: false },
    { label: 'Discount',    val: totalDiscount.toFixed(2), isBold: false },
    { label: 'CR/DR',       val: crDr.toFixed(2), isBold: false },
    { label: 'FREIGHT',     val: freight.toFixed(2), isBold: false },
    { label: 'Round off',   val: roundOff.toFixed(2), isBold: false },
    { label: 'GRAND TOTAL', val: grandTotal.toFixed(2), isBold: true },
  ];

  let sumY = tableBottomY + 3;
  sumLines.forEach(sl => {
    if (sl.isBold) {
      doc.font('Helvetica-Bold').fontSize(8.5);
    } else {
      doc.font('Helvetica').fontSize(7.5);
    }

    doc.text(sl.label, summarySplitX + 6, sumY);
    doc.text(':', summarySplitX + 65, sumY);
    doc.text(sl.val, summarySplitX + 75, sumY, { width: rightX - summarySplitX - 82, align: 'right' });

    sumY += 9.5;
  });

  // ── 6. BOTTOM FOOTER SECTION ─────────────────────────────────────────────
  // Horizontal line separating summary and bottom bar
  doc.moveTo(leftX, summaryBottomY).lineTo(rightX, summaryBottomY).stroke();

  // Amount in words (Bottom Left)
  doc.font('Helvetica').fontSize(7.5).fillColor('#000000');
  doc.text(wordsStr, leftX + 8, summaryBottomY + 6, { width: 280, ellipsis: true });

  // User & Time & OLD Balance
  doc.font('Helvetica').fontSize(7.5);
  doc.text(`User:${cashier}   Time:${timeStr}`, 320, summaryBottomY + 3);
  doc.text(`OLD Balance   ${oldBalance}`, 320, summaryBottomY + 12);

  doc.end();
  return doc;
}

module.exports = generateInvoice;
