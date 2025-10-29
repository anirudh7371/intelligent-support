import React, { useState, useEffect, useRef } from 'react';

function ChatInterface({ ticket, onBack }) {
  const [messages, setMessages] = useState(ticket.chatHistory || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      sender: 'user',
      message: input,
      timestamp: new Date()
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/chat-handler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: ticket.ticketId,
          message: input,
          ticketId: ticket.ticketId
        })
      });

      const data = await response.json();

      const botMessage = {
        sender: 'bot',
        message: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <button onClick={onBack}>← Back</button>
        <h3>Ticket #{ticket.ticketId.slice(0, 8)}</h3>
        <span className={`status ${ticket.status}`}>{ticket.status}</span>
      </div>

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.sender}`}>
            <div className="message-content">{msg.message}</div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {loading && <div className="message bot loading">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;