import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import './App.css';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  const [agent, setAgent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAgent(user);
      if (user) {
        loadTickets();
      }
    });
    return unsubscribe;
  }, []);

  const loadTickets = () => {
    const q = query(
      collection(db, 'tickets'),
      where('status', 'in', ['open', 'in_progress'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      ticketData.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      
      setTickets(ticketData);
    });

    return unsubscribe;
  };

  const handleClaimTicket = async (ticketId) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        assignedAgent: agent.uid,
        status: 'in_progress'
      });
      alert('Ticket claimed successfully!');
    } catch (error) {
      console.error('Error claiming ticket:', error);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'resolved',
        resolvedAt: new Date()
      });
      setSelectedTicket(null);
      alert('Ticket resolved!');
    } catch (error) {
      console.error('Error resolving ticket:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'my') return ticket.assignedAgent === agent?.uid;
    if (filter === 'unassigned') return !ticket.assignedAgent;
    return true;
  });

  if (!agent) {
    return <AgentLogin />;
  }

  return (
    <div className="agent-dashboard">
      <header>
        <h1>Agent Dashboard</h1>
        <div className="agent-info">
          <span>{agent.email}</span>
          <button onClick={() => auth.signOut()}>Logout</button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="ticket-sidebar">
          <div className="filters">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All ({tickets.length})
            </button>
            <button 
              className={filter === 'my' ? 'active' : ''}
              onClick={() => setFilter('my')}
            >
              My Tickets ({tickets.filter(t => t.assignedAgent === agent.uid).length})
            </button>
            <button 
              className={filter === 'unassigned' ? 'active' : ''}
              onClick={() => setFilter('unassigned')}
            >
              Unassigned ({tickets.filter(t => !t.assignedAgent).length})
            </button>
          </div>

          <div className="ticket-list">
            {filteredTickets.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedTicket?.id === ticket.id}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        </aside>

        <main className="ticket-details">
          {selectedTicket ? (
            <TicketDetails
              ticket={selectedTicket}
              agentId={agent.uid}
              onClaim={handleClaimTicket}
              onResolve={handleResolveTicket}
            />
          ) : (
            <div className="no-selection">
              <p>Select a ticket to view details</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AgentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  return (
    <div className="agent-login">
      <h2>Agent Portal Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Agent Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

function TicketCard({ ticket, isSelected, onClick }) {
  const getPriorityColor = (priority) => {
    return {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    }[priority];
  };

  return (
    <div 
      className={`ticket-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <span 
          className="priority-indicator"
          style={{ backgroundColor: getPriorityColor(ticket.priority) }}
        />
        <span className="ticket-id">#{ticket.id.slice(0, 6)}</span>
      </div>
      <h4>{ticket.subject}</h4>
      <p className="description">{ticket.description.slice(0, 60)}...</p>
      <div className="card-footer">
        <span className="status">{ticket.status}</span>
        {ticket.assignedAgent && <span className="assigned">Assigned</span>}
      </div>
    </div>
  );
}

function TicketDetails({ ticket, agentId, onClaim, onResolve }) {
  const [reply, setReply] = useState('');

  const handleSendReply = async () => {
    if (!reply.trim()) return;

    try {
      const ticketRef = doc(getFirestore(), 'tickets', ticket.id);
      const newMessage = {
        sender: 'agent',
        message: reply,
        timestamp: new Date()
      };

      const currentHistory = ticket.chatHistory || [];
      await updateDoc(ticketRef, {
        chatHistory: [...currentHistory, newMessage]
      });

      setReply('');
      alert('Reply sent!');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const isAssignedToMe = ticket.assignedAgent === agentId;
  const canClaim = !ticket.assignedAgent;

  return (
    <div className="ticket-details">
      <div className="details-header">
        <h2>{ticket.subject}</h2>
        <div className="actions">
          {canClaim && (
            <button onClick={() => onClaim(ticket.id)} className="btn-claim">
              Claim Ticket
            </button>
          )}
          {isAssignedToMe && (
            <button onClick={() => onResolve(ticket.id)} className="btn-resolve">
              Resolve
            </button>
          )}
        </div>
      </div>

      <div className="ticket-meta">
        <div className="meta-item">
          <strong>Priority:</strong> {ticket.priority}
        </div>
        <div className="meta-item">
          <strong>Status:</strong> {ticket.status}
        </div>
        <div className="meta-item">
          <strong>Sentiment:</strong> {ticket.sentiment?.score?.toFixed(2) || 'N/A'}
        </div>
      </div>

      <div className="ticket-description">
        <h3>Description</h3>
        <p>{ticket.description}</p>
      </div>

      <div className="chat-history">
        <h3>Chat History</h3>
        <div className="messages">
          {(ticket.chatHistory || []).map((msg, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              <div className="message-sender">{msg.sender}</div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))}
        </div>
      </div>

      {isAssignedToMe && (
        <div className="reply-section">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            rows="4"
          />
          <button onClick={handleSendReply}>Send Reply</button>
        </div>
      )}
    </div>
  );
}

export default App;