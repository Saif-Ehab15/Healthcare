import React, { useState, useRef, useEffect, useCallback } from "react";
import "../Chatbot/Chatbot.css";

const questions = [
  { q: "Clinic time?", a: "The clinic is open from 2:00 PM to 12:00 AM." },
  { q: "How can I book an appointment?", a: "You can book an appointment through the 'Book Now' page or by calling 12345." },
  { q: "Is the hospital open 24 hours?", a: "Yes, the emergency department is open 24 hours every day." },
  { q: "Where can I see my lab results?", a: "You can check your lab results on the 'Results' section of the website or at the hospital reception." },
  { q: "What is the emergency number?", a: "The emergency number is 12345 and it’s available at any time." },
];

const initialMessages = [
  { sender: "bot", text: "Hello 👋 I'm the hospital assistant! How can I help you today?" },
];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const chatBoxRef = useRef(null);
  const typingTimerRef = useRef(null);

  // smooth scroll to bottom when messages change
  useEffect(() => {
    const el = chatBoxRef.current;
    if (!el) return;
    // small timeout to let the new message render then scroll smoothly
    const id = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 60);
    return () => clearTimeout(id);
  }, [messages, isOpen]);

  // Add message with simulated typing delay (to feel natural)
  const pushBotAnswer = useCallback((userQ, answer) => {
    // push user message immediately
    setMessages(prev => [...prev, { sender: "user", text: userQ }]);

    // simulate typing for bot
    setIsTyping(true);
    // clear any previous timer
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    // set delay based on answer length (capped)
    const delay = Math.min(1200 + answer.length * 20, 2200);

    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: "bot", text: answer }]);
      typingTimerRef.current = null;
    }, delay);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // performance: memoized click handler per question (small optimization)
  const handleQuestionClick = useCallback((item) => {
    pushBotAnswer(item.q, item.a);
  }, [pushBotAnswer]);

  return (
    <>
      {/* floating toggle */}
      {!isOpen && (
        <button
          className="chatbot-toggle"
          aria-label="Open chat"
          onClick={() => setIsOpen(true)}
        >
          <span className="chat-icon">💬</span>
        </button>
      )}

      {/* chat panel */}
      {isOpen && (
        <div className="chatbot-container" role="dialog" aria-modal="false">
          <div className="chatbot-header">
            <div className="header-left">
              <div className="header-avatar">🏥</div>
              <div className="header-title">
                <div className="title-main">Hospital Assistant</div>
                <div className="title-sub">Quick FAQ — tap to get answers</div>
              </div>
            </div>

            <div className="header-actions">
              <button className="minimize-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">×</button>
            </div>
          </div>

          <div className="chat-box" ref={chatBoxRef}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`chat-message ${m.sender === "bot" ? "bot" : "user"}`}
              >
                <div className="bubble">
                  <div className="bubble-text">{m.text}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message bot typing">
                <div className="bubble">
                  <div className="typing-dots" aria-hidden>
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="question-buttons">
            {questions.map((item, i) => (
              <button
                key={i}
                className="question-btn"
                onClick={() => handleQuestionClick(item)}
              >
                {item.q}
                <span className="ripple" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
