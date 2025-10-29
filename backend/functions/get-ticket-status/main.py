import functions_framework
from google.cloud import firestore
import json
from flask import jsonify

db = firestore.Client()

def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
    }

@functions_framework.http
def get_ticket_status(request):
    if request.method == 'OPTIONS':
        return ('', 204, _cors_headers())
    
    headers = _cors_headers()
    
    try:
        ticket_id = request.args.get('ticketId')
        user_id = request.args.get('userId')
        
        if not ticket_id or not user_id:
            return (jsonify({'error': 'Missing ticketId or userId'}), 400, headers)
        
        ticket_ref = db.collection('tickets').document(ticket_id)
        ticket = ticket_ref.get()
        
        if not ticket.exists:
            return (jsonify({'error': 'Ticket not found'}), 404, headers)
        
        ticket_data = ticket.to_dict()
        
        if ticket_data.get('userId') != user_id:
            return (jsonify({'error': 'Unauthorized'}), 403, headers)
        
        response_data = {
            'ticketId': ticket_id,
            'status': ticket_data.get('status'),
            'priority': ticket_data.get('priority'),
            'createdAt': ticket_data.get('createdAt').isoformat() if ticket_data.get('createdAt') else None,
            'chatHistory': ticket_data.get('chatHistory', [])
        }
        
        return (jsonify(response_data), 200, headers)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return (jsonify({'error': str(e)}), 500, headers)