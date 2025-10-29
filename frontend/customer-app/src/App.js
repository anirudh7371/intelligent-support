import React, { useState, useEffect, useCallback} from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import ChatInterface from './components/ChatInterface';
import TicketList from './components/TicketList';
import CreateTicket from './components/CreateTicket';
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
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [view, setView] = useState('list');

  const loadUserTickets = useCallback((userId) => {
    const q = query(collection(db, 'tickets'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by creation date, newest first
      ticketData.sort((a, b) => {
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

      setUser(user);
      if (user) {
        firestoreUnsubscribe = loadUserTickets(user.uid);
      } else {
        setTickets([]);
        setActiveTicket(null);
        firestoreUnsubscribe = () => {};
      }
    });

    return () => {
      authUnsubscribe();
      firestoreUnsubscribe();
    };
  }, [loadUserTickets]);

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + error.message);
    }
  };

  const handleSignup = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Signup error:', error);
      alert('Signup failed: ' + error.message);
    }
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onSignup={handleSignup} />;
  }

  return (
    <div className="app-container">
      <header>
        <h1>Customer Support</h1>
        <button onClick={() => auth.signOut()}>Logout</button>
      </header>

      <nav>
        <button 
          onClick={() => {
            setView('list');
            setActiveTicket(null);
          }} 
          className={view === 'list' ? 'active' : ''}
        >
          My Tickets ({tickets.length})
        </button>
        <button 
          onClick={() => {
            setView('create');
            setActiveTicket(null);
          }}
          className={view === 'create' ? 'active' : ''}
        >
          New Ticket
        </button>
      </nav>

      <main>
        {view === 'list' && (
          <TicketList 
            tickets={tickets} 
            onSelectTicket={(ticket) => {
              setActiveTicket(ticket);
              setView('chat');
            }}
          />
        )}

        {view === 'create' && (
          <CreateTicket 
            userId={user.uid}
            onCreated={() => {
              setView('list');
              setActiveTicket(null);
            }}
          />
        )}

        {view === 'chat' && activeTicket && (
          <ChatInterface 
            ticket={activeTicket}
            onBack={() => {
              setView('list');
              setActiveTicket(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

function AuthScreen({ onLogin, onSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      onLogin(email, password);
    } else {
      onSignup(email, password);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
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
          <button type="submit" className="auth-button">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="toggle-button">
          {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default App;