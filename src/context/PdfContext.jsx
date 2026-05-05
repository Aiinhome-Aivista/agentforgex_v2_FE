import { createContext, useContext } from 'react';

const PdfContext = createContext(false);

export const PDFProvider = PdfContext.Provider;

export const usePDF = () => {
  return useContext(PdfContext);
};
