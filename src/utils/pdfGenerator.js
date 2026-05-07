import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdfReport = async (elementId, filename = 'Agentic_AI_KT_Report.pdf') => {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    // Find all pages within the container
    const pages = container.querySelectorAll('.pdf-page');
    if (pages.length === 0) {
      console.warn('No .pdf-page elements found.');
      return false;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4' // A4 size is roughly 595.28 x 841.89 in px at 72dpi.
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const pageElement = pages[i];
      
      // Temporarily make it visible if it was hidden, but usually the parent container is positioned off-screen
      
      const canvas = await html2canvas(pageElement, {
        scale: 2, // Higher scale for better resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
