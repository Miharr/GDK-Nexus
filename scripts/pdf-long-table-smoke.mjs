import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const outputPath = resolve('pdf-samples/long-table-smoke.pdf');
mkdirSync(dirname(outputPath), { recursive: true });

const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
const margin = { top: 76, right: 32, bottom: 48, left: 32 };

doc.setFillColor(30, 41, 59);
doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F');
doc.setFillColor(249, 115, 22);
doc.rect(0, 18, doc.internal.pageSize.getWidth(), 4, 'F');
doc.setFillColor(255, 247, 237);
doc.roundedRect(margin.left, 30, 8, 28, 2, 2, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(15, 23, 42);
doc.text('GDK NEXUS PDF LONG TABLE SMOKE TEST', margin.left + 16, 40);
doc.setFontSize(9);
doc.setTextColor(51, 65, 85);
doc.text('Generated sample with repeated headers, avoided row splits, and visible page borders.', margin.left + 16, 56);
doc.setDrawColor(249, 115, 22);
doc.setLineWidth(1.1);
doc.line(margin.left, 66, doc.internal.pageSize.getWidth() - margin.right, 66);

const rows = Array.from({ length: 95 }, (_, index) => {
  const row = index + 1;
  return {
    no: `${row}`,
    description: `Installment ${row}`,
    notes: `Long printable row for page break testing. Row ${row} should stay together.`,
    dueDate: `2026-${String((index % 12) + 1).padStart(2, '0')}-15`,
    amount: `Rs. ${(row * 12500).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
});

autoTable(doc, {
  theme: 'grid',
  startY: 76,
  margin,
  showHead: 'everyPage',
  showFoot: 'lastPage',
  pageBreak: 'auto',
  rowPageBreak: 'avoid',
  tableWidth: 500,
  tableLineColor: [71, 85, 105],
  tableLineWidth: 0.9,
  columns: [
    { header: '#', dataKey: 'no' },
    { header: 'Description', dataKey: 'description' },
    { header: 'Notes', dataKey: 'notes' },
    { header: 'Due Date', dataKey: 'dueDate' },
    { header: 'Amount', dataKey: 'amount' },
  ],
  body: rows,
  foot: [{ no: '', description: 'Total', notes: '', dueDate: '', amount: 'Rs. 59,37,500' }],
  styles: {
    font: 'helvetica',
    fontStyle: 'normal',
    fontSize: 8.7,
    cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
    overflow: 'linebreak',
    valign: 'middle',
    lineColor: [71, 85, 105],
    lineWidth: 0.65,
    textColor: [15, 23, 42],
    minCellWidth: 4,
  },
  headStyles: {
    fillColor: [30, 41, 59],
    textColor: [255, 255, 255],
    lineColor: [30, 41, 59],
    lineWidth: 0.8,
    fontStyle: 'bold',
    fontSize: 8.4,
  },
  alternateRowStyles: {
    fillColor: [241, 245, 249],
  },
  footStyles: {
    fillColor: [255, 247, 237],
    textColor: [15, 23, 42],
    lineColor: [234, 88, 12],
    lineWidth: 0.8,
    fontStyle: 'bold',
    fontSize: 8.8,
  },
  columnStyles: {
    no: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
    description: { cellWidth: 90, fontStyle: 'bold' },
    notes: { cellWidth: 180 },
    dueDate: { cellWidth: 78 },
    amount: { cellWidth: 120, halign: 'right', fontStyle: 'bold' },
  },
});

const pageCount = doc.internal.getNumberOfPages();
for (let page = 1; page <= pageCount; page++) {
  doc.setPage(page);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(249, 115, 22);
  doc.setLineWidth(0.8);
  doc.line(margin.left, pageHeight - 34, pageWidth - margin.right, pageHeight - 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('GDK NEXUS 2442', margin.left, pageHeight - 20);
  doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin.right, pageHeight - 20, { align: 'right' });
}

if (pageCount < 2) {
  throw new Error(`Expected a multi-page PDF, got ${pageCount} page.`);
}

writeFileSync(outputPath, Buffer.from(doc.output('arraybuffer')));
console.log(`Generated ${outputPath} (${pageCount} pages).`);
