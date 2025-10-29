import functions_framework
from google.cloud import firestore
import datetime
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
def chat_handler(request):
    if request.method == 'OPTIONS':
        return ('', 204, _cors_headers())
    
    headers = _cors_headers()
    
    try:
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return (jsonify({'error': 'No data provided'}), 400, headers)
        
        message = request_json.get('message')
        ticket_id = request_json.get('ticketId')
        
        if not message or not ticket_id:
            return (jsonify({'error': 'Missing message or ticketId'}), 400, headers)
        
        bot_reply = generate_simple_response(message)
        
        ticket_ref = db.collection('tickets').document(ticket_id)
        ticket = ticket_ref.get()
        
        if not ticket.exists:
            return (jsonify({'error': 'Ticket not found'}), 404, headers)
        
        ticket_data = ticket.to_dict()
        current_history = ticket_data.get('chatHistory', [])
        
        new_messages = [
            {
                'sender': 'user',
                'message': message,
                'timestamp': datetime.datetime.now()
            },
            {
                'sender': 'bot',
                'message': bot_reply,
                'timestamp': datetime.datetime.now()
            }
        ]
        
        current_history.extend(new_messages)
        ticket_ref.update({'chatHistory': current_history})
        
        return (jsonify({'reply': bot_reply}), 200, headers)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return (jsonify({'error': str(e)}), 500, headers)

def generate_simple_response(message):
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['hello', 'hi', 'hey']):
        return "Hello! I'm here to help you. How can I assist you today?"
    elif any(word in message_lower for word in ['password', 'login']):
        return "I can help you with login issues. You can reset your password by clicking 'Forgot Password' on the login page."
    elif any(word in message_lower for word in ['thank', 'thanks']):
        return "You're very welcome! Is there anything else I can help you with?"
    else:
        return "I understand your concern. Could you provide more details so I can better assist you?"