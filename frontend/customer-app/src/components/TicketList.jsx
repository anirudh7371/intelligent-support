import React from 'react';

function TicketList({ tickets, onSelectTicket }) {
  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
    return colors[priority] || '#6b7280';
  };

  return (
    <div className="ticket-list">
      <h2>My Support Tickets</h2>
      {tickets.length === 0 ? (
        <p>No tickets yet. Create one to get started!</p>
      ) : (
        <div className="tickets">
          {tickets.map(ticket => (
            <div 
              key={ticket.id} 
              className="ticket-card"
              onClick={() => onSelectTicket(ticket)}
            >
              <div className="ticket-header">
                <h3>{ticket.subject}</h3>
                <span 
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                >
                  {ticket.priority}
                </span>
              </div>
              <p className="ticket-description">{ticket.description}</p>
              <div className="ticket-footer">
                <span className="status">{ticket.status}</span>
                <span className="date">
                  {new Date(ticket.createdAt?.toDate()).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TicketList;