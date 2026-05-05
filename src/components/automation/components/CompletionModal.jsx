import React from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

export default function CompletionModal({ isOpen, onClose, apiResponse }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-[300px] w-full border border-slate-100 overflow-hidden"
        style={{ animation: 'modalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 relative ${apiResponse?.status === 'error' ? 'bg-red-50' : 'bg-emerald-50'
            }`}>
            <div className={`absolute inset-0 rounded-full animate-ping opacity-25 ${apiResponse?.status === 'error' ? 'bg-red-100' : 'bg-emerald-100'
              }`} />
            {apiResponse?.status === 'error' ? (
              <AlertCircle className="w-8 h-8 text-red-500 relative z-10" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-500 relative z-10" />
            )}
          </div>

          <h3 className="text-base font-bold text-slate-800 mb-6 leading-tight">
            {apiResponse?.message || (apiResponse?.status === 'error' ? 'Operation Failed' : 'Process Complete')}
          </h3>
        </div>
      </div>
    </div>
  );
}
