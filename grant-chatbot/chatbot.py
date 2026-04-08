# Grant Chatbot Service
# Uses Ollama with Llama 3 for free, local AI inference

# Install dependencies:
# pip install flask flask-cors requests

# Requirements:
# 1. Install Ollama: https://ollama.ai/
# 2. Run: ollama pull llama3
# 3. Run: ollama serve (default port 11434)

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import os
import json

app = Flask(__name__)
CORS(app)

OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
MODEL_NAME = os.environ.get('MODEL_NAME', 'grok')

SYSTEM_PROMPT = """You are GrantHub Assistant, a helpful AI assistant for the GMS Grant Management System.

You can help users with:
- General questions about grants, funding, and the application process
- Explaining system features and how to use them
- Providing guidance on grant eligibility, requirements, and best practices
- Answering questions about the project, workflow, and documentation
- Helping with administrative tasks and user guidance

Be concise, helpful, and friendly. If you don't know something, say so honestly.
Format your responses using clear, readable text. Use markdown for emphasis when helpful.
Respond to greetings warmly and conversationally."""

def generate_response(user_message, conversation_history=None):
    """Generate response using Ollama API"""
    
    # Build messages array with system prompt and conversation history
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    
    # Add conversation history for context
    if conversation_history:
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            messages.append(msg)
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 500
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('message', {}).get('content', 'I apologize, but I could not generate a response.')
        else:
            return f"I apologize, but I'm having trouble connecting to the AI service. (Error: {response.status_code})"
            
    except requests.exceptions.ConnectionError:
        return "I'm currently unavailable. Please ensure Ollama is running on your system (run 'ollama serve')."
    except requests.exceptions.Timeout:
        return "The request took too long. Please try again with a simpler question."
    except Exception as e:
        return f"An error occurred: {str(e)}"

@app.route('/health', methods=['GET'])
def health_check():
    """Check if Ollama is available"""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            model_names = [m.get('name', '') for m in models]
            return jsonify({
                "status": "ok",
                "ollama_connected": True,
                "available_models": model_names,
                "current_model": MODEL_NAME
            })
    except Exception as e:
        return jsonify({
            "status": "error",
            "ollama_connected": False,
            "error": str(e)
        }), 503

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint"""
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({"error": "Message is required"}), 400
    
    user_message = data['message']
    conversation_history = data.get('history', [])
    
    response = generate_response(user_message, conversation_history)
    
    return jsonify({
        "success": True,
        "response": response,
        "model": MODEL_NAME
    })

@app.route('/chat/stream', methods=['POST'])
def chat_stream():
    """Streaming chat endpoint for real-time responses"""
    from flask import stream_with_context
    
    data = request.get_json()
    
    if not data or 'message' not in data:
        return jsonify({"error": "Message is required"}), 400
    
    user_message = data['message']
    conversation_history = data.get('history', [])
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    
    if conversation_history:
        for msg in conversation_history[-10:]:
            messages.append(msg)
    
    messages.append({"role": "user", "content": user_message})
    
    def generate():
        try:
            response = requests.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": MODEL_NAME,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9
                    }
                },
                stream=True,
                timeout=60
            )
            
            for chunk in response.iter_lines():
                if chunk:
                    import json
                    try:
                        data = json.loads(chunk)
                        if 'message' in data and 'content' in data['message']:
                            yield f"data: {json.dumps({'content': data['message']['content']})}\n\n"
                    except:
                        pass
                        
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Grant Chatbot on port {port}")
    print(f"Using Ollama at: {OLLAMA_BASE_URL}")
    print(f"Model: {MODEL_NAME}")
    app.run(host='0.0.0.0', port=port, debug=True)