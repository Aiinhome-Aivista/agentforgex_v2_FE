/**
 * Chatbot.jsx — UPDATED (now with context-driven re-analysis)
 *
 * Spec section 8 (existing):
 *  - Only answer AgentForgeX-related questions (backend enforces).
 *  - Out-of-scope queries get the canned out-of-scope message.
 *  - "Explain process" / "Show process steps" / "Automation details" answer
 *    dynamically from the current workflow data (handled by backend intents).
 *  - After sending a message the chat area auto-refreshes:
 *      • input clears
 *      • scrolls to the latest message
 *      • new bot message rendered as soon as it arrives
 *
 * NEW behaviour:
 *  - When the user provides ADDITIONAL CONTEXT about the process inside the
 *    chat (e.g. "actually we also need a fraud check before payment"), the
 *    bot reply will include `offer_reanalyze: true` and a `captured_context`
 *    string.  The chat then renders a "Re-analyze process" action button
 *    next to that bot message.
 *  - Clicking that button POSTs to /api/chatbot/reanalyze.  On success the
 *    bot replies with a confirmation message and fires a global
 *    `agentforgex:process-reanalyzed` window event so the parent page can
 *    refresh its data.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, X, Send, Loader2, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage, triggerReanalysis } from '../services/api';

const INITIAL_MESSAGE = {
  id: 'bot-welcome',
  text:
    "Hi! I'm AgentForgeX — I can answer questions about your current workflow, " +
    "process steps, and automation suggestions. You can also tell me additional " +
    "context about the process and I'll offer to re-analyze it. Try \"Explain " +
    "process\" or \"Show process steps\".",
  isBot: true,
};

function renderFormattedText(text, isBot = true) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = [];
  let currentList = [];
  let currentListType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (currentList.length > 0) {
      if (currentListType === 'ul') {
        blocks.push(
          <ul key={`ul-${blocks.length}`} className="list-disc pl-5 my-1.5 space-y-1">
            {currentList}
          </ul>
        );
      } else if (currentListType === 'ol') {
        blocks.push(
          <ol key={`ol-${blocks.length}`} className="list-decimal pl-5 my-1.5 space-y-1">
            {currentList}
          </ol>
        );
      }
      currentList = [];
      currentListType = null;
    }
  };

  const parseInline = (str) => {
    if (!str) return '';
    const parts = [];
    
    const regex = /(\*\*|__)(.*?)\1|(`)(.*?)\3|(\*)(.*?)\5/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      const plainText = str.substring(lastIndex, match.index);
      if (plainText) {
        parts.push(plainText);
      }

      if (match[1]) {
        parts.push(
          <strong key={`b-${match.index}`} className={isBot ? "font-bold text-white" : "font-extrabold text-black"}>
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        parts.push(
          <code key={`c-${match.index}`} className={isBot ? "bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono text-[#00FF9D]" : "bg-black/10 px-1.5 py-0.5 rounded text-xs font-mono text-black font-semibold"}>
            {match[4]}
          </code>
        );
      } else if (match[5]) {
        parts.push(<em key={`i-${match.index}`} className="italic">{match[6]}</em>);
      }

      lastIndex = regex.lastIndex;
    }

    const remainingText = str.substring(lastIndex);
    if (remainingText) {
      parts.push(remainingText);
    }

    return parts.length > 0 ? parts : str;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const parsedText = parseInline(headingText);
      
      const headingCls = 
        level === 1 ? 'text-lg font-extrabold text-white mt-3 mb-1.5' :
        level === 2 ? 'text-base font-bold text-white mt-2.5 mb-1' :
        level === 3 ? 'text-sm font-bold text-white mt-2 mb-0.5' :
        'text-sm font-semibold text-white mt-1.5 mb-0.5';

      const Tag = `h${level}`;
      blocks.push(
        React.createElement(Tag, { key: `h-${idx}`, className: headingCls }, parsedText)
      );
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
      }
      currentList.push(
        <li key={`li-${idx}`} className={isBot ? "text-gray-300 text-sm" : "text-[#0A0A0B] text-sm font-medium"}>
          {parseInline(ulMatch[1])}
        </li>
      );
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
      }
      currentList.push(
        <li key={`li-${idx}`} className={isBot ? "text-gray-300 text-sm" : "text-[#0A0A0B] text-sm font-medium"}>
          {parseInline(olMatch[2])}
        </li>
      );
      continue;
    }

    flushList();

    blocks.push(
      <p key={`p-${idx}`} className={isBot ? "my-1 text-gray-300 leading-relaxed text-sm" : "my-1 text-[#0A0A0B] leading-relaxed text-sm font-medium"}>
        {parseInline(line)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-1">{blocks}</div>;
}


export default function Chatbot() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const params = useParams();

  const [isOpen, setIsOpen] = useState(false);
  const [isBouncing, setIsBouncing] = useState(true);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [reanalyzingId, setReanalyzingId] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const processKey =
    params.id ||
    location.pathname.match(/\/analysis\/([^/?]+)/)?.[1] ||
    location.pathname.match(/\/suggestion\/([^/?]+)/)?.[1] ||
    null;

  const isVisiblePath =
    location.pathname.includes('/analysis/') ||
    location.pathname.includes('/suggestion/') ||
    location.pathname.includes('/workspaces/');
  const shouldShow = isAuthenticated && isVisiblePath;

  useEffect(() => {
    const timer = setTimeout(() => setIsBouncing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Auto-scroll after every messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isSending, reanalyzingId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const toggleChat = () => setIsOpen((v) => !v);

  const handleSend = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = (message || '').trim();
    if (!text || isSending) return;

    const userMsg = { id: `u-${Date.now()}`, text, isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setIsSending(true);

    const typingId = `b-typing-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: typingId, text: '…', isBot: true, isTyping: true,
    }]);

    try {
      const resp = await sendChatMessage(text, processKey);
      const answer = resp?.answer || resp?.data?.answer ||
                     "I couldn't process that — please try a different question.";

      // Detect the context-provision offer
      const offerReanalyze =
        resp?.offer_reanalyze === true || resp?.data?.offer_reanalyze === true;
      const capturedContext =
        resp?.captured_context || resp?.data?.captured_context || text;

      setMessages((prev) => prev
        .filter((m) => m.id !== typingId)
        .concat({
          id: `b-${Date.now()}`,
          text: answer,
          isBot: true,
          inScope: resp?.in_scope !== false,
          intent: resp?.intent || null,
          offerReanalyze,
          capturedContext: offerReanalyze ? capturedContext : null,
          reanalyzeState: offerReanalyze ? 'offered' : null,
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

  // ── NEW: handle the "Re-analyze" action button ──────────────────────────
  const handleReanalyze = useCallback(async (msg) => {
    if (!processKey || !msg?.capturedContext) return;
    setReanalyzingId(msg.id);

    // Update the offered message to show "in progress"
    setMessages((prev) => prev.map((m) =>
      m.id === msg.id ? { ...m, reanalyzeState: 'running' } : m,
    ));

    // Add a transient bot message so the user sees progress in the thread
    const progressId = `b-reanalyzing-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: progressId,
      text: 'Re-analyzing the process with the new context…',
      isBot: true,
      isTyping: true,
    }]);

    try {
      const resp = await triggerReanalysis(processKey, msg.capturedContext);
      const ok = resp?.status === true || resp?.data?.status === true;
      const message =
        resp?.message ||
        resp?.data?.message ||
        (ok
          ? 'Process re-analyzed successfully.'
          : 'Re-analysis did not complete cleanly — please refresh and try again.');
      const revisionCount =
        resp?.revision_count ?? resp?.data?.revision_count ?? 0;

      setMessages((prev) => prev
        .filter((m) => m.id !== progressId)
        .map((m) =>
          m.id === msg.id
            ? { ...m, reanalyzeState: ok ? 'done' : 'failed' }
            : m,
        )
        .concat({
          id: `b-${Date.now()}`,
          text: ok
            ? `✓ ${message} ${revisionCount > 0 ? `(${revisionCount} context update${revisionCount === 1 ? '' : 's'} applied.)` : ''}\n\nThe analysis page will refresh to show the updated steps, suggestions, and exports.`
            : `⚠ ${message}`,
          isBot: true,
          isSuccess: ok,
          isError: !ok,
        }));

      if (ok) {
        // Fire a global event so the parent AnalysisPage can refetch.
        window.dispatchEvent(new CustomEvent('agentforgex:process-reanalyzed', {
          detail: { processKey, revisionCount, refreshedAt: Date.now() },
        }));
      }
    } catch (err) {
      setMessages((prev) => prev
        .filter((m) => m.id !== progressId)
        .map((m) =>
          m.id === msg.id ? { ...m, reanalyzeState: 'failed' } : m,
        )
        .concat({
          id: `b-err-${Date.now()}`,
          text: `Re-analysis failed: ${err.message || 'unknown error'}.`,
          isBot: true,
          isError: true,
        }));
    } finally {
      setReanalyzingId(null);
    }
  }, [processKey]);

  // ── NEW: let the user decline the offered re-analysis cleanly ───────────
  const handleDeclineReanalyze = useCallback((msg) => {
    setMessages((prev) => prev.map((m) =>
      m.id === msg.id ? { ...m, reanalyzeState: 'declined' } : m,
    ).concat({
      id: `b-${Date.now()}`,
      text:
        "No problem — I've kept the context for later. You can ask me to re-analyze at any time " +
        "by saying \"please re-analyze the process\".",
      isBot: true,
    }));
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!shouldShow) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-transparent z-40" onClick={toggleChat} />
      )}

      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg bg-[#00FF9D] text-[#0A0A0B] hover:bg-[#00e68d] transition-all duration-300 z-50 ${isOpen ? 'scale-0' : 'scale-100'} ${isBouncing && !isOpen ? 'animate-bounce' : ''}`}
        aria-label="Open chat"
      >
        <MessageCircle size={28} />
      </button>

      <div
        className={`fixed bottom-6 right-6 w-85 sm:w-[480px] h-[650px] max-h-[85vh] bg-[#121214] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 transform origin-[calc(100%-30px)_calc(100%-30px)] ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
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
          className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isBot ? 'items-start' : 'items-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-sm break-words ${
                  msg.isBot
                    ? msg.isError
                      ? 'bg-red-500/20 text-red-200 rounded-tl-none'
                      : msg.isSuccess
                        ? 'bg-emerald-500/15 text-emerald-100 rounded-tl-none border border-emerald-500/30'
                        : 'bg-[#27272A] text-gray-200 rounded-tl-none'
                    : 'bg-[#00FF9D] text-[#0A0A0B] font-medium rounded-tr-none'
                }`}
              >
                {msg.isTyping ? (
                  <span className="inline-flex items-center gap-1 text-white/60">
                    <Loader2 size={14} className="animate-spin" />
                    {msg.text === '…' ? 'thinking…' : msg.text}
                  </span>
                ) : (
                  renderFormattedText(msg.text, msg.isBot)
                )}
              </div>

              {/* Re-analyze action buttons */}
              {msg.offerReanalyze && msg.reanalyzeState === 'offered' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleReanalyze(msg)}
                    disabled={reanalyzingId === msg.id || !processKey}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF9D] text-[#0A0A0B] text-xs font-bold uppercase tracking-wider hover:bg-[#00e68d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={13} />
                    Re-analyze process
                  </button>
                  <button
                    onClick={() => handleDeclineReanalyze(msg)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] text-white/70 text-xs font-bold uppercase tracking-wider hover:bg-[#3F3F46] transition-colors"
                  >
                    Not now
                  </button>
                </div>
              )}
              {msg.offerReanalyze && msg.reanalyzeState === 'running' && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] text-white/60 text-xs">
                  <Loader2 size={13} className="animate-spin" />
                  Re-analyzing…
                </div>
              )}
              {msg.offerReanalyze && msg.reanalyzeState === 'done' && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs border border-emerald-500/30">
                  <CheckCircle2 size={13} />
                  Re-analyzed
                </div>
              )}
              {msg.offerReanalyze && msg.reanalyzeState === 'declined' && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] text-white/40 text-xs">
                  Declined
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 border-t border-[#27272A] bg-[#1A1A1D] rounded-b-2xl">
          <div className="relative flex items-end">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isSending ? 'Thinking…' : 'Ask, or add context about the process…'}
              disabled={isSending}
              rows={2}
              className="w-full bg-[#0A0A0B] text-white border border-[#27272A] rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:border-[#00FF9D] transition-colors disabled:opacity-50 resize-none min-h-[52px] max-h-[120px] overflow-y-auto text-sm leading-relaxed"
            />
            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className="absolute right-3 bottom-2.5 p-2 bg-[#00FF9D] text-[#0A0A0B] rounded-full hover:bg-[#00e68d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
