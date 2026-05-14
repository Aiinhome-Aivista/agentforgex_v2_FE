import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Chatbot() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI assistant. How can I help you today?", isBot: true }
  ]);

  // Determine if the chatbot should be visible on the current page
  const isVisiblePath = location.pathname.includes('/analysis/') || location.pathname.includes('/suggestion/');
  const shouldShow = isAuthenticated && isVisiblePath;

  useEffect(() => {
    // Stop bouncing after 2 seconds
    const timer = setTimeout(() => {
      setIsBouncing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Prevent background scrolling when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Add user message
    const newMsg = { id: Date.now(), text: message, isBot: false };
    setMessages([...messages, newMsg]);
    setMessage('');
    
    // Simulate bot response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Thanks for your message. I am currently a demonstration bot and cannot answer specific queries yet.",
        isBot: true
      }]);
    }, 1000);
  };

  if (!shouldShow) return null;

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-40"
          onClick={toggleChat}
        />
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg bg-[#00FF9D] text-[#0A0A0B] hover:bg-[#00e68d] transition-all duration-300 z-50 ${isOpen ? 'scale-0' : 'scale-100'} ${isBouncing && !isOpen ? 'animate-bounce' : ''}`}
        aria-label="Open chat"
      >
        <MessageCircle size={28} />
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 transform origin-[calc(100%-30px)_calc(100%-30px)] ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#27272A] bg-[#1A1A1D] rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#00FF9D] flex justify-center items-center">
              <MessageCircle size={18} className="text-[#0A0A0B]" />
            </div>
            <h3 className="text-white font-semibold">AI Assistant</h3>
          </div>
          <button 
            onClick={toggleChat}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                  msg.isBot 
                    ? 'bg-[#27272A] text-gray-200 rounded-tl-none' 
                    : 'bg-[#00FF9D] text-[#0A0A0B] font-medium rounded-tr-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-[#27272A] bg-[#1A1A1D] rounded-b-2xl">
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full bg-[#0A0A0B] text-white border border-[#27272A] rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-[#00FF9D] transition-colors"
            />
            <button 
              type="submit"
              disabled={!message.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#00FF9D] text-[#0A0A0B] rounded-full hover:bg-[#00e68d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
