/**
 * Chatbot.jsx — UPDATED
 *
 * Spec section 8:
 *  - Only answer AgentForgeX-related questions (backend enforces).
 *  - Out-of-scope queries get the canned out-of-scope message.
 *  - "Explain process" / "Show process steps" / "Automation details" answer
 *    dynamically from the current workflow data (handled by backend intents).
 *  - After sending a message the chat area auto-refreshes:
 *      • input clears
 *      • scrolls to the latest message
 *      • new bot message rendered as soon as it arrives
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage } from '../services/api';

const INITIAL_MESSAGE = {
  id: 'bot-welcome',
  text: "Hi! I'm AgentForgeX — I can answer questions about your current workflow, process steps, and automation suggestions. Try \"Explain process\" or \"Show process steps\".",
  isBot: true,
};

export default function Chatbot() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const params = useParams();

  const [isOpen, setIsOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Determine the current process_key for backend context.  Routes used:
  //   /analysis/:id   →  id IS the process_key
  //   /suggestion/:id →  id is a suggestion_key — we still pass it; backend
  //                      gracefully ignores when it doesn't match a process
  //   /workspaces/:id →  pass as-is too (backend falls back to no-context)
  const processKey =
    params.id ||
    location.pathname.match(/\/analysis\/([^/?]+)/)?.[1] ||
    location.pathname.match(/\/suggestion\/([^/?]+)/)?.[1] ||
    null;

  // Only render the bot on workflow-relevant pages
  const isVisiblePath =
    location.pathname.includes('/analysis/') ||
    location.pathname.includes('/suggestion/') ||
    location.pathname.includes('/workspaces/');
  const shouldShow = isAuthenticated && isVisiblePath;

  // Bouncing indicator wears off after 2s
  useEffect(() => {
    const timer = setTimeout(() => setIsBouncing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Lock background scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // ── AUTO-SCROLL to the latest message after every messages change ──────
  useEffect(() => {
    // Use scrollIntoView for the anchor at the end of the list.
    // Also fall back to manual scrollTop for older browsers.
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Defer so the slide-in transition completes
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const toggleChat = () => setIsOpen((v) => !v);

  const handleSend = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = (message || '').trim();
    if (!text || isSending) return;

    // 1. Optimistically push the user message
    const userMsg = { id: `u-${Date.now()}`, text, isBot: false };
    setMessages((prev) => [...prev, userMsg]);

    // 2. CLEAR INPUT immediately (spec section 8)
    setMessage('');
    setIsSending(true);

    // 3. Add a transient "typing" placeholder so the user sees activity
    const typingId = `b-typing-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: typingId,
      text: '…',
      isBot: true,
      isTyping: true,
    }]);

    try {
      const resp = await sendChatMessage(text, processKey);
      const answer = resp?.answer || resp?.data?.answer ||
                     "I couldn't process that — please try a different question.";

      setMessages((prev) => prev
        .filter((m) => m.id !== typingId)
        .concat({
          id: `b-${Date.now()}`,
          text: answer,
          isBot: true,
          inScope: resp?.in_scope !== false,
          intent: resp?.intent || null,
        }));
    } catch (err) {
      setMessages((prev) => prev
        .filter((m) => m.id !== typingId)
        .concat({
          id: `b-err-${Date.now()}`,
          text: 'Sorry — I had trouble reaching the workflow service. Please try again.',
          isBot: true,
          isError: true,
        }));
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, processKey]);

  // Allow Enter to submit (without breaking Shift+Enter for newlines)
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!shouldShow) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-transparent z-40" onClick={toggleChat} />
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
            <div className="flex flex-col">
              <h3 className="text-white font-semibold leading-tight">AgentForgeX Assistant</h3>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">
                Workflow & process Q&amp;A
              </span>
            </div>
          </div>
          <button onClick={toggleChat} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-sm whitespace-pre-wrap break-words ${
                  msg.isBot
                    ? `${msg.isError ? 'bg-red-500/20 text-red-200' : 'bg-[#27272A] text-gray-200'} rounded-tl-none`
                    : 'bg-[#00FF9D] text-[#0A0A0B] font-medium rounded-tr-none'
                }`}
              >
                {msg.isTyping ? (
                  <span className="inline-flex items-center gap-1 text-white/60">
                    <Loader2 size={14} className="animate-spin" /> thinking…
                  </span>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {/* invisible anchor that we scroll to */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-[#27272A] bg-[#1A1A1D] rounded-b-2xl">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isSending ? 'Thinking…' : 'Ask about the process, steps, or automation…'}
              disabled={isSending}
              className="w-full bg-[#0A0A0B] text-white border border-[#27272A] rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-[#00FF9D] transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#00FF9D] text-[#0A0A0B] rounded-full hover:bg-[#00e68d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSending
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} />}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
