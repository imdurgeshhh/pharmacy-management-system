import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export tabular data to an Excel (.xlsx) spreadsheet.
 * @param {Array<Object>} data - Array of row objects.
 * @param {Array<{ key: string, label: string }>} columns - Column definitions with key and label.
 * @param {string} filename - Target filename without extension.
 */
export const exportToExcel = (data = [], columns = [], filename = 'export') => {
  const sheetData = [
    columns.map(c => c.label),
    ...data.map(row => columns.map(c => row[c.key] ?? ''))
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export tabular data to a professionally formatted PDF.
 * @param {Array<Object>} data - Array of row objects.
 * @param {Array<{ key: string, label: string }>} columns - Column definitions.
 * @param {string} title - Header title printed in the PDF banner.
 * @param {string} filename - Target filename without extension.
 * @param {Array<number>} [accentRgb=[16, 185, 129]] - Brand banner RGB color array.
 */
export const exportToPDF = (
  data = [],
  columns = [],
  title = 'Report',
  filename = 'report',
  accentRgb = [16, 185, 129]
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Header band
  doc.setFillColor(...accentRgb);
  doc.rect(0, 0, doc.internal.pageSize.width, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 24);
  doc.setTextColor(60, 60, 60);

  // Table grid
  autoTable(doc, {
    startY: 46,
    head: [columns.map(c => c.label)],
    body: data.map(row => columns.map(c => row[c.key] ?? '')),
    headStyles: {
      fillColor: accentRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 6 },
  });

  doc.save(`${filename}.pdf`);
};
