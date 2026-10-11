import { useState } from 'react';
import { createPdfFromHtml, sharePdfReportFile } from '../services/pdfReportGenerator';

/**
 * State of a report preview: the HTML is shown right away, the PDF file is only printed
 * when the user shares it (printing takes a moment and is not needed just to look).
 */
export function usePdfReport() {
  const [html, setHtml] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [pdf, setPdf] = useState<{ html: string; uri: string } | null>(null);

  const open = (reportHtml: string) => {
    setHtml(reportHtml);
    setVisible(true);
  };

  const share = async () => {
    if (!html || isSharing) return;
    setIsSharing(true);
    try {
      let uri = pdf?.html === html ? pdf.uri : null;
      if (!uri) {
        uri = (await createPdfFromHtml(html))?.uri ?? null;
        if (uri) setPdf({ html, uri });
      }
      if (uri) await sharePdfReportFile(uri);
    } finally {
      setIsSharing(false);
    }
  };

  return { html, visible, isSharing, open, share, close: () => setVisible(false) };
}
