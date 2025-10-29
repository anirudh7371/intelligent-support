import functions_framework
from google.cloud import firestore
from google.cloud import language_v1
import datetime
import uuid
from flask import jsonify

db = firestore.Client()
language_client = language_v1.LanguageServiceClient()

def _cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '3600'
    }

@functions_framework.http
def create_ticket(request):
    if request.method == 'OPTIONS':
        return ('', 204, _cors_headers())
    
    headers = _cors_headers()
    
    try:
        request_json = request.get_json(silent=True)
        
        if not request_json:
            return (jsonify({'error': 'No data provided'}), 400, headers)
        
        user_id = request_json.get('userId')
        subject = request_json.get('subject')
        description = request_json.get('description')
        
        if not all([user_id, subject, description]):
            return (jsonify({'error': 'Missing required fields'}), 400, headers)
        
        try:
            document = language_v1.Document(
                content=description,
                type_=language_v1.Document.Type.PLAIN_TEXT
            )
            sentiment = language_client.analyze_sentiment(
                request={'document': document}
            ).document_sentiment
            
            score = sentiment.score
            magnitude = sentiment.magnitude
        except Exception as e:
            print(f"Sentiment analysis failed: {e}")
            score = 0.0
            magnitude = 0.0
        
        priority = 'high' if score < -0.3 else 'medium' if score < 0.3 else 'low'
        
        ticket_id = str(uuid.uuid4())
        ticket = {
            'ticketId': ticket_id,
            'userId': user_id,
            'subject': subject,
            'description': description,
            'status': 'open',
            'priority': priority,
            'sentiment': {
                'score': score,
                'magnitude': magnitude
            },
            'createdAt': datetime.datetime.now(),
            'assignedAgent': None,
            'chatHistory': []
        }
        
        db.collection('tickets').document(ticket_id).set(ticket)
        
        response_data = {
            'ticketId': ticket_id,
            'priority': priority,
            'status': 'open'
        }
        
        return (jsonify(response_data), 201, headers)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return (jsonify({'error': str(e)}), 500, headers)