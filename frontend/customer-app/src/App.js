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
      ticketData.sort((a, b) => 
        (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)
      );

      setTickets(ticketData);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let firestoreUnsubscribe = () => {}; // Initialize as an empty function

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      // Clean up any *previous* listener before setting a new one
      firestoreUnsubscribe();

      setUser(user);
      if (user) {
        // User is logged in, create new listener
        firestoreUnsubscribe = loadUserTickets(user.uid);
      } else {
        // User is logged out, clear data
        setTickets([]);
        firestoreUnsubscribe = () => {}; // Reset to empty
      }
    });

    // Return a cleanup function for when the component unmounts
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
          onClick={() => setView('list')} 
          className={view === 'list' ? 'active' : ''}
        >
          My Tickets
        </button>
        <button 
          onClick={() => setView('create')}
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
            onBack={() => setView('list')}
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
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