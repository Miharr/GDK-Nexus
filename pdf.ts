type PdfOrientation = 'portrait' | 'landscape';

const loadedScripts = new Map<string, Promise<void>>();

const loadScript = (src: string) => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadedScripts.has(src)) return loadedScripts.get(src)!;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      loadedScripts.delete(src);
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
};

const ensurePdfRuntime = async (requireAutoTable = true) => {
  const win = window as any;
  if (!win.jspdf?.jsPDF) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }

  if (!win.jspdf?.jsPDF) {
    throw new Error('PDF engine failed to load.');
  }

  if (!requireAutoTable) return;

  const probe = new win.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  if (typeof probe.autoTable !== 'function' && !win.jspdfAutoTable?.default && !win.jspdfAutoTable && !win.autoTable) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js');
  }

  const testDoc = new win.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
  if (typeof testDoc.autoTable !== 'function' && !win.jspdfAutoTable?.default && !win.jspdfAutoTable && !win.autoTable) {
    throw new Error('PDF table engine failed to load.');
  }
};

export const createPdfDoc = async (orientation: PdfOrientation = 'portrait', requireAutoTable = true) => {
  try {
    await ensurePdfRuntime(requireAutoTable);
    const JsPDF = (window as any).jspdf.jsPDF;
    return new JsPDF({ orientation, unit: 'pt', format: 'a4' });
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const downloadHtmlPdf = async (
  elementId: string,
  filename: string,
  orientation: PdfOrientation = 'portrait',
  margin: number | number[] = 0.5
) => {
  try {
    const win = window as any;
    if (!win.html2pdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }

    if (!win.html2pdf) {
      alert('PDF download engine could not load. Please refresh and try again.');
      return false;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      alert('PDF template was not found. Please refresh and try again.');
      return false;
    }

    element.style.display = 'block';
    try {
      await win.html2pdf().set({
        margin,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', '.pdf-row', '.pdf-card'] },
      }).from(element).save();
    } finally {
      element.style.display = 'none';
    }
    return true;
  } catch (error) {
    console.error(error);
    alert('PDF download failed. Please refresh and try again.');
    return false;
  }
};

export const autoTable = (doc: any, options: Record<string, unknown>) => {
  const win = window as any;
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
    return;
  }

  const tableFn = win.jspdfAutoTable?.default || win.jspdfAutoTable || win.autoTable;
  if (typeof tableFn !== 'function') {
    throw new Error('PDF table engine is unavailable.');
  }
  tableFn(doc, options);
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

if (typeof window !== 'undefined') {
  void ensurePdfRuntime().catch(() => undefined);
}
