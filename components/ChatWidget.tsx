'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
  status?: 'sending' | 'sent' | 'delivered';
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-message">
      <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        SA
      </div>
      <div className="chat-bubble-incoming px-4 py-3 max-w-[75%]">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm SASA AI Assistant. How can I help you today? Ask me anything about sales, vouchers, or the leaderboard!",
      sender: 'bot',
      time: formatTime(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      time: formatTime(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Update status to sent
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, status: 'delivered' } : m))
      );
    }, 500);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          sender: 'bot',
          time: formatTime(),
        },
      ]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I couldn't connect. Please try again.",
          sender: 'bot',
          time: formatTime(),
        },
      ]);
    }
  }

  const CheckIcon = ({ double, blue }: { double?: boolean; blue?: boolean }) => (
    <svg
      width="16"
      height="11"
      viewBox="0 0 16 11"
      fill="none"
      className={`inline-block ml-1 ${blue ? 'text-blue-500' : 'text-gray-400'}`}
    >
      <path
        d={double ? 'M11.07 0.93L4.5 7.5L1.93 4.93L0.5 6.36L4.5 10.36L12.5 2.36L11.07 0.93ZM8.07 0.93L6.64 2.36L10.14 5.86L11.57 4.43L8.07 0.93Z' : 'M5.5 9.36L1.14 5L0 6.14L5.5 11.64L16.5 0.64L15.36 -0.5L5.5 9.36Z'}
        fill="currentColor"
      />
    </svg>
  );

  return (
    <>
      {/* Chat FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-navy-600 rounded-full shadow-navy flex items-center justify-center text-white hover:bg-navy-700 transition-all active:scale-95 z-50"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </button>
      )}

      {/* Chat Window - Full screen on mobile */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] flex flex-col z-50 sm:rounded-2xl sm:shadow-2xl overflow-hidden animate-fade-in">
          {/* Header - WhatsApp style */}
          <div className="bg-navy-700 text-white px-3 py-2.5 flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setIsOpen(false)}
              className="sm:hidden w-8 h-8 flex items-center justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-navy-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">SASA AI Assistant</div>
              <div className="text-[11px] text-green-300 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Online
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hidden sm:flex w-8 h-8 items-center justify-center hover:bg-white/10 rounded-full transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area - WhatsApp background */}
          <div className="flex-1 overflow-y-auto chat-bg p-3 space-y-2">
            {/* Date chip */}
            <div className="flex justify-center mb-2">
              <span className="bg-white/80 text-gray-600 text-[11px] px-3 py-1 rounded-full shadow-sm">
                Today
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'items-end gap-2'} animate-message`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    SA
                  </div>
                )}
                <div
                  className={`${
                    msg.sender === 'user' ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'
                  } px-3 py-2 max-w-[80%] sm:max-w-[75%]`}
                >
                  <p className="text-[13px] sm:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>
                  <div className="flex items-center justify-end gap-0.5 mt-1">
                    <span className="text-[10px] text-gray-500">{msg.time}</span>
                    {msg.sender === 'user' && (
                      <CheckIcon
                        double={msg.status === 'delivered'}
                        blue={msg.status === 'delivered'}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="bg-cream-100 p-2 flex items-center gap-2 flex-shrink-0 border-t border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm outline-none border border-gray-200 focus:border-navy-400 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="w-10 h-10 bg-navy-600 rounded-full flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
