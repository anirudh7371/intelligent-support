import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

function ChatInterface({ ticket, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const db = getFirestore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Listen to real-time updates from Firestore
  useEffect(() => {
    const ticketRef = doc(db, 'tickets', ticket.ticketId || ticket.id);
    
    const unsubscribe = onSnapshot(ticketRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMessages(data.chatHistory || []);
      }
    });

    return () => unsubscribe();
  }, [ticket.ticketId, ticket.id, db]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/chat-handler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: ticket.ticketId || ticket.id,
          message: input,
          ticketId: ticket.ticketId || ticket.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Message will be added via Firestore listener
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // Handle Firestore Timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleTimeString();
    }
    
    // Handle regular Date
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <button onClick={onBack} className="back-button">← Back</button>
        <h3>{ticket.subject || `Ticket #${(ticket.ticketId || ticket.id).slice(0, 8)}`}</h3>
        <span className={`status status-${ticket.status}`}>{ticket.status}</span>
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              <div className="message-header">
                {msg.sender === 'user' ? 'You' : 
                 msg.sender === 'bot' ? 'AI Assistant' : 
                 msg.senderEmail || 'Agent'}
              </div>
              <div className="message-content">{msg.message}</div>
              <div className="message-time">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          ))
        )}
        {loading && <div className="message bot">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
          placeholder="Type your message..."
          disabled={loading || ticket.status === 'resolved'}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || !input.trim() || ticket.status === 'resolved'}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;