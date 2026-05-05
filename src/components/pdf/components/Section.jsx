import { usePDF } from "../../../context/PdfContext";
import clsx from "clsx";

export default function Section({ title, children }) {
  const isPDF = usePDF();

  return (
    <div
      className={clsx(
        "px-4",
        isPDF && "pdf-section"
      )}
      style={isPDF ? { pageBreakInside: "avoid" } : {}}
    >
      <h2
        className={clsx(
          "font-semibold mb-6",
          isPDF
            ? "text-lg font-bold text-gray-900 border-b pb-2"
            : "text-base text-gray-800"
        )}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}