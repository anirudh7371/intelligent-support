import functions_framework
from google.cloud import firestore
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
def agent_assign(request):
    if request.method == 'OPTIONS':
        return ('', 204, _cors_headers())
    
    headers = _cors_headers()
    
    try:
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return (jsonify({'error': 'No data provided'}), 400, headers)
        
        ticket_id = request_json.get('ticketId')
        agent_id = request_json.get('agentId')
        
        if not ticket_id or not agent_id:
            return (jsonify({'error': 'Missing ticketId or agentId'}), 400, headers)
        
        # Update ticket - use firestore.SERVER_TIMESTAMP
        ticket_ref = db.collection('tickets').document(ticket_id)
        ticket_ref.update({
            'assignedAgent': agent_id,
            'status': 'in_progress',
            'assignedAt': firestore.SERVER_TIMESTAMP
        })
        
        return (jsonify({'success': True, 'message': 'Ticket assigned successfully'}), 200, headers)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return (jsonify({'error': str(e)}), 500, headers)