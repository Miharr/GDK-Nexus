type PdfOrientation = 'portrait' | 'landscape';

export const createPdfDoc = (orientation: PdfOrientation = 'portrait') => {
  const JsPDF = (window as any).jspdf?.jsPDF;
  if (!JsPDF) {
    alert('PDF engine is still loading. Please try again in a moment.');
    return null;
  }

  const doc = new JsPDF({ orientation, unit: 'pt', format: 'a4' });
  if (typeof (doc as any).autoTable !== 'function') {
    alert('PDF table engine is still loading. Please try again in a moment.');
    return null;
  }

  return doc;
};

export const pdfTableDefaults = {
  theme: 'grid',
  showHead: 'everyPage',
  rowPageBreak: 'avoid',
  styles: {
    fontSize: 8,
    cellPadding: 5,
    overflow: 'linebreak',
    valign: 'middle',
    lineColor: [229, 231, 235],
    lineWidth: 0.6,
    textColor: [31, 41, 55],
  },
  headStyles: {
    fillColor: [31, 41, 55],
    textColor: [255, 255, 255],
    lineColor: [31, 41, 55],
    lineWidth: 0.6,
    fontStyle: 'bold',
  },
  footStyles: {
    fillColor: [243, 244, 246],
    textColor: [17, 24, 39],
    lineColor: [156, 163, 175],
    lineWidth: 0.8,
    fontStyle: 'bold',
  },
} as const;

export const addPdfHeader = (doc: any, title: string, subtitle?: string) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(title, 40, 42);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    doc.text(subtitle, 40, 58);
  }
};

export const addPdfFooter = (doc: any) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 84, doc.internal.pageSize.getHeight() - 24);
  }
};
