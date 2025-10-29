import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';
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
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const loadTickets = useCallback(() => {
    // Load ALL tickets (no where clause)
    const ticketsRef = collection(db, 'tickets');

    const unsubscribe = onSnapshot(ticketsRef, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by priority and date
      ticketData.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.priority && b.priority && priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        const timeA = a.createdAt?.toDate?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toDate?.() || b.createdAt || 0;
        return new Date(timeB) - new Date(timeA);
      });

      setTickets(ticketData);
    }, (error) => {
      console.error('Error loading tickets:', error);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let firestoreUnsubscribe = () => {};

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      firestoreUnsubscribe();

      setAgent(user);
      if (user) {
        firestoreUnsubscribe = loadTickets();
      } else {
        setTickets([]);
        firestoreUnsubscribe = () => {};
      }
    });

    return () => {
      authUnsubscribe();
      firestoreUnsubscribe();
    };
  }, [loadTickets]);

  const handleClaimTicket = async (ticketId) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        assignedAgent: agent.uid,
        assignedAgentEmail: agent.email,
        status: 'in_progress'
      });
      alert('Ticket claimed successfully!');
    } catch (error) {
      console.error('Error claiming ticket:', error);
      alert('Failed to claim ticket: ' + error.message);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: agent.email
      });
      setSelectedTicket(null);
      alert('Ticket resolved!');
    } catch (error) {
      console.error('Error resolving ticket:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    if (filter === 'my') {
      if (ticket.assignedAgent !== agent?.uid) return false;
    } else if (filter === 'unassigned') {
      if (ticket.assignedAgent) return false;
    } else if (filter === 'open') {
      if (ticket.status !== 'open' && ticket.status !== 'in_progress') return false;
    } else if (filter === 'resolved') {
      if (ticket.status !== 'resolved') return false;
    }
    
    // Department filter
    if (departmentFilter !== 'all') {
      if (ticket.department !== departmentFilter) return false;
    }
    
    return true;
  });

  const getDepartmentCounts = () => {
    const counts = { Finance: 0, IT: 0, HR: 0, Support: 0 };
    tickets.forEach(ticket => {
      if (ticket.department && counts.hasOwnProperty(ticket.department)) {
        counts[ticket.department]++;
      }
    });
    return counts;
  };

  const departmentCounts = getDepartmentCounts();

  if (!agent) {
    return <AgentLogin />;
  }

  return (
    <div className="agent-dashboard">
      <header>
        <h1>🎯 Agent Dashboard</h1>
        <div className="agent-info">
          <span className="agent-email">👤 {agent.email}</span>
          <button onClick={() => auth.signOut()} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="ticket-sidebar">
          <div className="filter-section">
            <h3>Status Filters</h3>
            <div className="filters">
              <button 
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                📋 All Tickets ({tickets.length})
              </button>
              <button 
                className={filter === 'open' ? 'active' : ''}
                onClick={() => setFilter('open')}
              >
                🔓 Open ({tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})
              </button>
              <button 
                className={filter === 'my' ? 'active' : ''}
                onClick={() => setFilter('my')}
              >
                👨‍💼 My Tickets ({tickets.filter(t => t.assignedAgent === agent.uid).length})
              </button>
              <button 
                className={filter === 'unassigned' ? 'active' : ''}
                onClick={() => setFilter('unassigned')}
              >
                ⭕ Unassigned ({tickets.filter(t => !t.assignedAgent).length})
              </button>
              <button 
                className={filter === 'resolved' ? 'active' : ''}
                onClick={() => setFilter('resolved')}
              >
                ✅ Resolved ({tickets.filter(t => t.status === 'resolved').length})
              </button>
            </div>
          </div>

          <div className="filter-section">
            <h3>Department Filters</h3>
            <div className="filters department-filters">
              <button 
                className={departmentFilter === 'all' ? 'active' : ''}
                onClick={() => setDepartmentFilter('all')}
              >
                🏢 All Departments
              </button>
              <button 
                className={departmentFilter === 'Finance' ? 'active dept-finance' : 'dept-finance'}
                onClick={() => setDepartmentFilter('Finance')}
              >
                💰 Finance ({departmentCounts.Finance})
              </button>
              <button 
                className={departmentFilter === 'IT' ? 'active dept-it' : 'dept-it'}
                onClick={() => setDepartmentFilter('IT')}
              >
                💻 IT ({departmentCounts.IT})
              </button>
              <button 
                className={departmentFilter === 'HR' ? 'active dept-hr' : 'dept-hr'}
                onClick={() => setDepartmentFilter('HR')}
              >
                👥 HR ({departmentCounts.HR})
              </button>
              <button 
                className={departmentFilter === 'Support' ? 'active dept-support' : 'dept-support'}
                onClick={() => setDepartmentFilter('Support')}
              >
                🎧 Support ({departmentCounts.Support})
              </button>
            </div>
          </div>

          <div className="ticket-list">
            {filteredTickets.length === 0 ? (
              <p className="no-tickets">No tickets match these filters</p>
            ) : (
              filteredTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedTicket?.id === ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))
            )}
          </div>
        </aside>

        <main className="ticket-details">
          {selectedTicket ? (
            <TicketDetails
              ticket={selectedTicket}
              agentId={agent.uid}
              agentEmail={agent.email}
              onClaim={handleClaimTicket}
              onResolve={handleResolveTicket}
            />
          ) : (
            <div className="no-selection">
              <div className="empty-state">
                <h2>👈 Select a ticket to view details</h2>
                <p>Choose any ticket from the list to see full information and take action</p>
              </div>
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
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Account created! You can now login.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="agent-login">
      <div className="login-card">
        <h2>🎯 {isSignup ? 'Create Agent Account' : 'Agent Portal Login'}</h2>
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
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="6"
          />
          <button type="submit" className="submit-btn">
            {isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>
        <button 
          onClick={() => setIsSignup(!isSignup)}
          className="toggle-btn"
        >
          {isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up'}
        </button>
      </div>
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

  const getDepartmentIcon = (dept) => {
    return {
      Finance: '💰',
      IT: '💻',
      HR: '👥',
      Support: '🎧'
    }[dept] || '📋';
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
          title={`${ticket.priority} priority`}
        />
        <span className="ticket-id">#{ticket.id?.slice(0, 8)}</span>
        <span className="department-badge">
          {getDepartmentIcon(ticket.department)} {ticket.department}
        </span>
      </div>
      <h4>{ticket.subject}</h4>
      <p className="description">{ticket.description?.slice(0, 60)}...</p>
      <div className="card-footer">
        <span className={`status-badge status-${ticket.status}`}>
          {ticket.status.replace('_', ' ')}
        </span>
        {ticket.assignedAgent && (
          <span className="assigned-badge">
            👤 Assigned
          </span>
        )}
      </div>
    </div>
  );
}

function TicketDetails({ ticket, agentId, agentEmail, onClaim, onResolve }) {
  const [reply, setReply] = useState('');

  const handleSendReply = async () => {
    if (!reply.trim()) return;

    try {
      const ticketRef = doc(getFirestore(), 'tickets', ticket.id);
      const newMessage = {
        sender: 'agent',
        senderEmail: agentEmail,
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
      alert('Failed to send reply');
    }
  };

  const isAssignedToMe = ticket.assignedAgent === agentId;
  const canClaim = !ticket.assignedAgent;
  const isResolved = ticket.status === 'resolved';

  const getDepartmentIcon = (dept) => {
    return {
      Finance: '💰',
      IT: '💻',
      HR: '👥',
      Support: '🎧'
    }[dept] || '📋';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      return new Date(timestamp).toLocaleString();
    } catch {
      return '';
    }
  };

  return (
    <div className="ticket-details">
      <div className="details-header">
        <div className="header-left">
          <h2>{ticket.subject}</h2>
          <span className="department-tag">
            {getDepartmentIcon(ticket.department)} {ticket.department} Department
          </span>
        </div>
        <div className="actions">
          {canClaim && !isResolved && (
            <button onClick={() => onClaim(ticket.id)} className="btn-claim">
              👋 Claim Ticket
            </button>
          )}
          {isAssignedToMe && !isResolved && (
            <button onClick={() => onResolve(ticket.id)} className="btn-resolve">
              ✅ Mark as Resolved
            </button>
          )}
        </div>
      </div>

      <div className="ticket-meta">
        <div className="meta-item">
          <strong>Priority:</strong>
          <span className={`priority-tag priority-${ticket.priority}`}>
            {ticket.priority?.toUpperCase()}
          </span>
        </div>
        <div className="meta-item">
          <strong>Status:</strong>
          <span className={`status-tag status-${ticket.status}`}>
            {ticket.status.replace('_', ' ')}
          </span>
        </div>
        <div className="meta-item">
          <strong>Sentiment:</strong>
          <span className="sentiment-score">
            {ticket.sentiment?.score ? 
              (ticket.sentiment.score < -0.3 ? '😢 Negative' : 
               ticket.sentiment.score < 0.3 ? '😐 Neutral' : '😊 Positive') 
              : 'N/A'}
          </span>
        </div>
        <div className="meta-item">
          <strong>Created:</strong>
          <span>{formatTimestamp(ticket.createdAt)}</span>
        </div>
      </div>

      {ticket.assignedAgent && (
        <div className="assigned-info">
          <strong>📌 Assigned to:</strong> {ticket.assignedAgentEmail || 'Agent'}
        </div>
      )}

      <div className="ticket-description">
        <h3>📝 Description</h3>
        <p>{ticket.description}</p>
      </div>

      <div className="chat-history">
        <h3>💬 Conversation History ({(ticket.chatHistory || []).length} messages)</h3>
        <div className="messages">
          {(ticket.chatHistory || []).length === 0 ? (
            <p className="no-messages">No messages yet</p>
          ) : (
            (ticket.chatHistory || []).map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                <div className="message-header">
                  <span className="message-sender">
                    {msg.sender === 'user' ? '👤 Customer' : 
                     msg.sender === 'bot' ? '🤖 AI Assistant' : 
                     `👨‍💼 ${msg.senderEmail || 'Agent'}`}
                  </span>
                  <span className="message-time">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAssignedToMe && !isResolved && (
        <div className="reply-section">
          <h3>✍️ Send Reply</h3>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply to the customer..."
            rows="4"
          />
          <button onClick={handleSendReply} disabled={!reply.trim()}>
            📤 Send Reply
          </button>
        </div>
      )}

      {isResolved && (
        <div className="resolved-message">
          ✅ This ticket has been resolved
          {ticket.resolvedBy && ` by ${ticket.resolvedBy}`}
        </div>
      )}
    </div>
  );
}

export default App;