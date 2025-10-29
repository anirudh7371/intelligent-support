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

def categorize_department(subject, description):
    """Categorize ticket into departments using keyword matching"""
    text = (subject + " " + description).lower()
    
    # Finance keywords
    finance_keywords = ['payment', 'billing', 'invoice', 'refund', 'charge', 'credit card', 
                       'subscription', 'money', 'price', 'cost', 'transaction', 'bank']
    
    # IT keywords
    it_keywords = ['login', 'password', 'error', 'bug', 'crash', 'technical', 'app', 
                   'website', 'loading', 'not working', 'server', 'access', 'install']
    
    # HR keywords
    hr_keywords = ['account', 'profile', 'settings', 'personal', 'email change', 
                   'delete account', 'privacy', 'data']
    
    # Support keywords
    support_keywords = ['help', 'how to', 'question', 'guide', 'tutorial', 'feature',
                       'understand', 'explain', 'show me']
    
    # Count matches
    finance_score = sum(1 for keyword in finance_keywords if keyword in text)
    it_score = sum(1 for keyword in it_keywords if keyword in text)
    hr_score = sum(1 for keyword in hr_keywords if keyword in text)
    support_score = sum(1 for keyword in support_keywords if keyword in text)
    
    scores = {
        'Finance': finance_score,
        'IT': it_score,
        'HR': hr_score,
        'Support': support_score
    }
    
    # Get department with highest score
    department = max(scores.items(), key=lambda x: x[1])[0]
    
    # If no clear match, default to Support
    if scores[department] == 0:
        department = 'Support'
    
    return department

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
        
        # Sentiment analysis
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
        
        # Priority based on sentiment
        priority = 'high' if score < -0.3 else 'medium' if score < 0.3 else 'low'
        
        # AI Department Categorization
        department = categorize_department(subject, description)
        
        # Create ticket
        ticket_id = str(uuid.uuid4())
        ticket = {
            'ticketId': ticket_id,
            'userId': user_id,
            'subject': subject,
            'description': description,
            'status': 'open',
            'priority': priority,
            'department': department,
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
            'department': department,
            'status': 'open'
        }
        
        return (jsonify(response_data), 201, headers)
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return (jsonify({'error': str(e)}), 500, headers)