import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdfReport = async (elementId, filename = 'Agentic_AI_KT_Report.pdf') => {
  const container = document.getElementById(elementId);
  if (!container) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  // The container lives inside a hidden wrapper (fixed, left:-9999px).
  // html2canvas needs elements to have real layout dimensions, so we
  // temporarily make the wrapper visible (but still off-screen visually)
  // during capture, then restore it.
  const hiddenWrapper = container.parentElement;
  const savedStyles = hiddenWrapper ? {
    position: hiddenWrapper.style.position,
    left: hiddenWrapper.style.left,
    top: hiddenWrapper.style.top,
    overflow: hiddenWrapper.style.overflow,
    zIndex: hiddenWrapper.style.zIndex,
    opacity: hiddenWrapper.style.opacity,
    pointerEvents: hiddenWrapper.style.pointerEvents,
  } : null;

  try {
    // Make the wrapper visible with real dimensions (but invisible to user)
    if (hiddenWrapper) {
      hiddenWrapper.style.position = 'fixed';
      hiddenWrapper.style.left = '0';
      hiddenWrapper.style.top = '0';
      hiddenWrapper.style.overflow = 'visible';
      hiddenWrapper.style.zIndex = '-1';
      hiddenWrapper.style.opacity = '0.01';
      hiddenWrapper.style.pointerEvents = 'none';
      hiddenWrapper.style.width = '1000px'; // Ensure enough width
      hiddenWrapper.style.height = '10000px'; // Ensure enough height for all pages
    }

    // Small delay to let browser recalculate layout
    await new Promise(r => setTimeout(r, 300));

    console.log(`[PDF] Container dimensions: ${container.offsetWidth}x${container.offsetHeight}`);
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('[PDF] Container has 0 dimensions! Force setting them...');
      container.style.width = '794px';
    }

    // Find all pages within the container
    const pages = container.querySelectorAll('.pdf-page');
    console.log(`[PDF] Found ${pages.length} pages to process.`);
    if (pages.length === 0) {
      console.warn('No .pdf-page elements found.');
      return false;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const pageElement = pages[i];
      console.log(`[PDF] Capturing page ${i + 1}/${pages.length}...`);

      try {
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          logging: true,
          backgroundColor: '#ffffff',
          width: 794,
          height: 1123,
          onclone: (clonedDoc, clonedEl) => {
            console.log(`[PDF] Page ${i + 1} cloned. Processing...`);
            // Remove ALL canvas elements
            const canvases = clonedDoc.querySelectorAll('canvas');
            if (canvases.length > 0) {
              console.log(`[PDF] Removing ${canvases.length} canvas elements from cloned page.`);
              canvases.forEach(c => c.remove());
            }

            // Ensure SVGs have explicit dimensions
            const svgs = clonedDoc.querySelectorAll('svg');
            svgs.forEach(svg => {
              const w = svg.getAttribute('width') || (svg.getBoundingClientRect ? svg.getBoundingClientRect().width : 0);
              const h = svg.getAttribute('height') || (svg.getBoundingClientRect ? svg.getBoundingClientRect().height : 0);
              if (!w || w === '0' || w === 0) svg.setAttribute('width', '794');
              if (!h || h === '0' || h === 0) svg.setAttribute('height', '100');
            });
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } catch (pageError) {
        console.error(`[PDF] Error capturing page ${i + 1}:`, pageError);
        // Optionally add a blank page or a placeholder if a page fails
        if (i > 0) pdf.addPage();
        pdf.text(`Error rendering page ${i + 1}`, 50, 50);
      }
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  } finally {
    // Always restore the hidden wrapper styles
    if (hiddenWrapper && savedStyles) {
      hiddenWrapper.style.position = savedStyles.position;
      hiddenWrapper.style.left = savedStyles.left;
      hiddenWrapper.style.top = savedStyles.top;
      hiddenWrapper.style.overflow = savedStyles.overflow;
      hiddenWrapper.style.zIndex = savedStyles.zIndex;
      hiddenWrapper.style.opacity = savedStyles.opacity;
      hiddenWrapper.style.pointerEvents = savedStyles.pointerEvents;
    }
  }
};
