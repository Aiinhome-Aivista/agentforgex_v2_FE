import React, { useRef, useState ,useEffect} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, ImageRun } from "docx";
import pptxgen from "pptxgenjs";
import { Download, Loader2, FileText, Presentation, File as FileIcon, ChevronDown } from "lucide-react";
import { PDFProvider } from "../../context/PdfContext";

import AutomationTab from "../analysis/AutomationTab";
import ERPContextTab from "../analysis/ERPContextTab";
import OverviewTab from "../analysis/OverviewTab";

export default function ExportPDF({ data }) {
  const [isExporting, setIsExporting] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const pdfRef = useRef();
  const menuRef = useRef();

  const { process, steps, suggestions, erp_modules, key_insights, top_automation_targets } = data;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowFormats(false);
      }
    };

    if (showFormats) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFormats]);

  const captureAtoms = async () => {
    const element = pdfRef.current;
    // Wait for components and charts to fully render
    await new Promise(resolve => setTimeout(resolve, 3000));
    const atoms = element.querySelectorAll('.pdf-atomic');
    return Array.from(atoms);
  };

  const exportToPdf = async (atoms) => {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);
    const usableHeightMm = pageHeight - (2 * margin);

    let currentYMm = margin;
    let isFirstPage = true;

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const canvas = await html2canvas(atom, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const atomWidthPx = canvas.width;
      const atomHeightPx = canvas.height;
      const pxPerMm = atomWidthPx / contentWidth;
      const atomHeightMm = atomHeightPx / pxPerMm;

      const remainingSpaceMm = pageHeight - margin - currentYMm;

      if (!isFirstPage && (atomHeightMm > remainingSpaceMm - 10)) {
        pdf.addPage();
        currentYMm = margin;
      }

      if (atomHeightMm > usableHeightMm) {
        let yOffsetPx = 0;
        while (yOffsetPx < atomHeightPx) {
          if (yOffsetPx > 0) {
            pdf.addPage();
            currentYMm = margin;
          }
          const sliceHeightPx = Math.min(usableHeightMm * pxPerMm, atomHeightPx - yOffsetPx);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = atomWidthPx;
          sliceCanvas.height = sliceHeightPx;
          const ctx = sliceCanvas.getContext('2d');
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, yOffsetPx, atomWidthPx, sliceHeightPx, 0, 0, atomWidthPx, sliceHeightPx);

          const sliceImgData = sliceCanvas.toDataURL("image/png");
          pdf.addImage(sliceImgData, "PNG", margin, currentYMm, contentWidth, sliceHeightPx / pxPerMm);
          yOffsetPx += (usableHeightMm * pxPerMm);
          currentYMm += (sliceHeightPx / pxPerMm);
        }
      } else {
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, currentYMm, contentWidth, atomHeightMm);
        currentYMm += atomHeightMm + 5;
      }
      isFirstPage = false;
    }
    pdf.save(`${process.title?.replace(/\s+/g, "_") || "Process"}_Report.pdf`);
  };

  const exportToWord = async (atoms) => {
    const children = [];

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const canvas = await html2canvas(atom, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 600; // Standard Word page width in points roughly
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imgData,
              transformation: {
                width: imgWidth,
                height: imgHeight,
              },
            }),
          ],
        })
      );
    }

    const doc = new Document({
      sections: [{
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${process.title?.replace(/\s+/g, "_") || "Process"}_Report.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPowerPoint = async (atoms) => {
    const pptx = new pptxgen();

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const canvas = await html2canvas(atom, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const slide = pptx.addSlide();
      
      // Add image to slide, fitting width
      slide.addImage({
        data: imgData,
        x: 0.5,
        y: 0.5,
        w: 9, // pptxgenjs uses inches by default
        h: (canvas.height * 9) / canvas.width,
        sizing: { type: 'contain', w: 9, h: 5 }
      });
    }

    await pptx.writeFile({ fileName: `${process.title?.replace(/\s+/g, "_") || "Process"}_Report.pptx` });
  };

  const handleDownload = async (format) => {
    setIsExporting(true);
    setShowFormats(false);
    try {
      const atoms = await captureAtoms();
      if (atoms.length === 0) return;

      if (format === "pdf") {
        await exportToPdf(atoms);
      } else if (format === "word") {
        await exportToWord(atoms);
      } else if (format === "pptx") {
        await exportToPowerPoint(atoms);
      }
    } catch (error) {
      console.error(`${format} Export failed:`, error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowFormats(!showFormats)}
          disabled={isExporting}
          className="btn-primary px-3 py-1.5 shadow-lg shadow-brand-500/20 flex items-center gap-2 text-xs font-bold uppercase tracking-widest rounded-md"
          title="Export Analysis"
        >
          {isExporting ? (
            <Loader2 size={18} className="animate-spin text-black" />
          ) : (
            <>
              <Download size={18} className="text-black" />
              <ChevronDown size={14} className="text-black opacity-50" />
            </>
          )}
        </button>

        {showFormats && (
          <div className="absolute right-0 top-10 w-48 bg-[#0e0e10] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2 flex flex-col gap-1">
              <button
                onClick={() => handleDownload("pdf")}
                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all text-left"
              >
                <FileIcon size={14} className="text-red-500" />
                <span>Export as PDF</span>
              </button>
              <button
                onClick={() => handleDownload("word")}
                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all text-left"
              >
                <FileText size={14} className="text-blue-500" />
                <span>Export as Word</span>
              </button>
              <button
                onClick={() => handleDownload("pptx")}
                className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all text-left"
              >
                <Presentation size={14} className="text-orange-500" />
                <span>Export as PPT</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden container for PDF rendering */}
      <div
        style={{
          position: "fixed",
          zIndex: -100,
          top: 0,
          left: "-2000px",
          pointerEvents: "none",
          background: "#fff"
        }}
      >
        <div
          ref={pdfRef}
          className="pdf-report"
          style={{
            width: "800px",
            padding: "40px",
          }}
        >
          <PDFProvider value={true}>
            <div className="flex flex-col text-left">
              {/* COVER PAGE ATOMS */}
              <div className="pdf-atomic py-20 px-10">
                <p className="text-brand-600 font-black text-xs uppercase tracking-[0.4em] mb-4">Automation Intelligence Report</p>
                <h1 className="text-4xl font-black text-gray-900 leading-[1.1] tracking-tight mb-4">
                  {process.title || "Process Analysis"}
                </h1>

              </div>

              <div className="pdf-atomic px-8 mb-8">
                <p className="text-lg text-gray-600 font-semibold whitespace-pre-line break-words">
                  {process.description}
                </p>
              </div>

              <div className="pdf-atomic px-10 mb-20">
                <div className="grid grid-cols-2 gap-12 w-full bg-gray-50 p-10 rounded-[40px] border border-gray-100">
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-3">Automation Score</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-7xl font-black text-brand-600">{process.automation_score}%</p>
                    </div>
                  </div>
                  <div className="border-l border-gray-200 pl-12 flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-3">Report Context</p>
                    <p className="text-xl font-bold text-gray-900 mb-1">System: {process.erp_system || "Enterprise"}</p>
                    <p className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {/* TABS - Already marked with pdf-atomic inside */}
              <OverviewTab insights={key_insights} topTargets={top_automation_targets} steps={steps} />
              <ERPContextTab erpModules={erp_modules} process={process} />
              <AutomationTab suggestions={suggestions} />
            </div>
          </PDFProvider>
        </div>
      </div>
    </>
  );
}
