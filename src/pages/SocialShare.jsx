import React, { useState } from 'react';
import { Instagram, Link as LinkIcon, Printer, Check } from 'lucide-react';

const FacebookIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const WhatsAppIcon = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12.031 1.531C6.236 1.531 1.53 6.237 1.53 12.031c0 1.86.488 3.666 1.417 5.25L1.5 22.5l5.353-1.405a10.457 10.457 0 0 0 5.178 1.365h.004c5.794 0 10.501-4.706 10.501-10.5A10.453 10.453 0 0 0 12.031 1.531zm0 17.653h-.003a8.777 8.777 0 0 1-4.477-1.22l-.321-.19-3.327.873.886-3.245-.209-.333A8.766 8.766 0 0 1 3.25 12.03c0-4.846 3.945-8.79 8.783-8.79 2.348 0 4.557.915 6.216 2.574A8.778 8.778 0 0 1 20.82 12.03c0 4.845-3.945 8.79-8.789 8.79zm4.821-6.586c-.264-.132-1.562-.771-1.805-.858-.242-.088-.419-.132-.596.132-.176.264-.683.858-.838 1.034-.154.176-.309.198-.573.066-1.127-.568-2.143-1.282-2.92-2.073-.6-.607-1.077-1.328-1.406-2.109-.154-.264.136-.251.385-.747.088-.176.044-.33-.022-.462-.066-.132-.596-1.436-.816-1.966-.214-.515-.433-.445-.596-.454-.154-.009-.331-.01-.508-.01-.176 0-.463.066-.705.33-.243.264-.926.904-.926 2.203s.948 2.555 1.08 2.731c.132.176 1.863 2.842 4.512 3.986.63.272 1.122.434 1.505.556.634.202 1.21.173 1.666.105.512-.077 1.562-.638 1.782-1.255.22-.617.22-1.146.154-1.255-.066-.11-.242-.176-.506-.308z"/>
  </svg>
);

export default function SocialShare() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram does not have a direct web sharing URL API. Opening the site as a fallback.
    window.open('https://instagram.com', '_blank');
  };

  return (
    <div className="flex items-center flex-wrap gap-4">
      <span className="text-sm font-black tracking-widest text-white uppercase">
        SHARE:
      </span>
      <div className="flex items-center gap-3">
        <button onClick={handleFacebookShare} className="w-10 h-10 rounded-full border border-white/20 bg-transparent flex items-center justify-center transition-colors hover:bg-white/10 text-white/70 hover:text-white">
          <FacebookIcon size={18} />
        </button>
        <button onClick={handleWhatsAppShare} className="w-10 h-10 rounded-full border border-white/20 bg-transparent flex items-center justify-center transition-colors hover:bg-white/10 text-white/70 hover:text-white">
          <WhatsAppIcon size={18} />
        </button>
        <button onClick={handleInstagramShare} className="w-10 h-10 rounded-full border border-white/20 bg-transparent flex items-center justify-center transition-colors hover:bg-white/10 text-white/70 hover:text-white">
          <Instagram size={18} />
        </button>
        <button onClick={handleCopyLink} className="w-10 h-10 rounded-full border border-white/20 bg-transparent flex items-center justify-center transition-colors hover:bg-white/10 text-white/70 hover:text-white">
          {copied ? <Check size={18} className="text-green-400" /> : <LinkIcon size={18} />}
        </button>
        <button onClick={handlePrint} className="w-10 h-10 rounded-full border border-white/20 bg-transparent flex items-center justify-center transition-colors hover:bg-white/10 text-white/70 hover:text-white">
          <Printer size={18} />
        </button>
      </div>
    </div>
  );
}
