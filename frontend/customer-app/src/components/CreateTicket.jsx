import React, { useState } from 'react';

function CreateTicket({ userId, onCreated }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subject,
          description
        })
      });

      const data = await response.json();
      alert(`Ticket created! ID: ${data.ticketId}`);
      onCreated();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-ticket">
      <h2>Create New Ticket</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="6"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
}

export default CreateTicket;