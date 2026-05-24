import { jsPDF } from 'jspdf';
import runAutoTable, { type UserOptions } from 'jspdf-autotable';

export type PdfOrientation = 'portrait' | 'landscape';
export type PdfDoc = jsPDF & {
  lastAutoTable?: {
    finalY?: number;
  };
};

const PAGE_MARGIN = {
  top: 76,
  right: 40,
  bottom: 48,
  left: 40,
};

const COLORS = {
  ink: [15, 23, 42] as [number, number, number],
  muted: [51, 65, 85] as [number, number, number],
  border: [71, 85, 105] as [number, number, number],
  softBorder: [148, 163, 184] as [number, number, number],
  appBg: [241, 245, 249] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
  orangeDark: [234, 88, 12] as [number, number, number],
  orangeSoft: [255, 247, 237] as [number, number, number],
  headerFill: [30, 41, 59] as [number, number, number],
  sectionFill: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export const createPdfDoc = async (orientation: PdfOrientation = 'portrait', _requireAutoTable = true): Promise<PdfDoc | null> => {
  try {
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4', compress: true }) as PdfDoc;
    doc.setProperties({
      title: 'GDK Nexus Report',
      subject: 'Print-ready GDK Nexus PDF export',
      creator: 'GDK Nexus 2442',
    });
    return doc;
  } catch (error) {
    console.error('PDF generation failed: unable to create jsPDF document.', error);
    return null;
  }
};

export const getPdfContentStartY = () => PAGE_MARGIN.top;

export const getPdfNextY = (doc: PdfDoc, fallback = PAGE_MARGIN.top) => {
  return (doc.lastAutoTable?.finalY || fallback) + 18;
};

export const formatPdfCurrency = (value: number | string) => {
  const raw = typeof value === 'number'
    ? value
    : Number(
      value
        .replace(/₹|â‚¹|Rs\.?|INR/gi, '')
        .replace(/,/g, '')
        .replace(/[^\d.-]/g, '')
    );

  if (Number.isFinite(raw)) {
    return `Rs. ${new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(raw)}`;
  }

  return String(value)
    .replace(/₹|â‚¹/g, 'Rs.')
    .replace(/\s+/g, ' ')
    .trim();
};

export const pdfTableDefaults: UserOptions = {
  theme: 'grid',
  showHead: 'everyPage',
  showFoot: 'lastPage',
  pageBreak: 'auto',
  rowPageBreak: 'avoid',
  margin: PAGE_MARGIN,
  tableLineColor: COLORS.border,
  tableLineWidth: 0.9,
  styles: {
    font: 'helvetica',
    fontStyle: 'normal',
    fontSize: 8.7,
    cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
    overflow: 'linebreak',
    valign: 'middle',
    lineColor: COLORS.border,
    lineWidth: 0.65,
    textColor: COLORS.ink,
  },
  headStyles: {
    fillColor: COLORS.headerFill,
    textColor: COLORS.white,
    lineColor: COLORS.headerFill,
    lineWidth: 0.8,
    fontStyle: 'bold',
    fontSize: 8.4,
  },
  bodyStyles: {
    fillColor: COLORS.white,
    textColor: COLORS.ink,
  },
  alternateRowStyles: {
    fillColor: COLORS.appBg,
  },
  footStyles: {
    fillColor: COLORS.orangeSoft,
    textColor: COLORS.ink,
    lineColor: COLORS.orangeDark,
    lineWidth: 0.8,
    fontStyle: 'bold',
    fontSize: 8.8,
  },
};

export const autoTable = (doc: PdfDoc, options: UserOptions) => {
  runAutoTable(doc, {
    ...pdfTableDefaults,
    ...options,
    styles: {
      ...pdfTableDefaults.styles,
      ...options.styles,
    },
    headStyles: {
      ...pdfTableDefaults.headStyles,
      ...options.headStyles,
    },
    bodyStyles: {
      ...pdfTableDefaults.bodyStyles,
      ...options.bodyStyles,
    },
    alternateRowStyles: {
      ...pdfTableDefaults.alternateRowStyles,
      ...options.alternateRowStyles,
    },
    footStyles: {
      ...pdfTableDefaults.footStyles,
      ...options.footStyles,
    },
    margin: {
      ...PAGE_MARGIN,
      ...(typeof options.margin === 'object' && !Array.isArray(options.margin) ? options.margin : {}),
    },
  });
};

export const addPdfHeader = (doc: PdfDoc, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...COLORS.headerFill);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, 18, pageWidth, 4, 'F');
  doc.setFillColor(...COLORS.orangeSoft);
  doc.roundedRect(PAGE_MARGIN.left, 30, 8, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.ink);
  doc.text(title, PAGE_MARGIN.left + 16, 40, { maxWidth: pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right - 16 });

  if (subtitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(subtitle, PAGE_MARGIN.left + 16, 56, { maxWidth: pageWidth - PAGE_MARGIN.left - PAGE_MARGIN.right - 16 });
  }

  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(1.1);
  doc.line(PAGE_MARGIN.left, 66, pageWidth - PAGE_MARGIN.right, 66);
};

export const addPdfFooter = (doc: PdfDoc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.orange);
    doc.setLineWidth(0.8);
    doc.line(PAGE_MARGIN.left, pageHeight - 34, pageWidth - PAGE_MARGIN.right, pageHeight - 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('GDK NEXUS 2442', PAGE_MARGIN.left, pageHeight - 20);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN.right, pageHeight - 20, { align: 'right' });
  }
};

export const failPdfDownload = (label: string, error: unknown) => {
  console.error(`PDF generation failed (${label}):`, error);
  alert(`${label} PDF generation failed. No file was downloaded. Please check the data and try again.`);
};
