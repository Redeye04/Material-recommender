"""
MaterialWise — Flask server
Serves the landing page (/) and AI chat page (/chat).
All AI logic is handled by the n8n workflow via webhook.
"""
from flask import Flask, render_template
from flask_cors import CORS
import config

app = Flask(__name__)
CORS(app)


@app.route('/')
def index():
    """Landing page — MaterialWise UI"""
    return render_template('index.html')


@app.route('/chat')
def chat():
    """AI chat page powered by n8n webhook"""
    return render_template(
        'chat.html',
        n8n_webhook_url=config.N8N_WEBHOOK_URL,
        n8n_webhook_route=config.N8N_WEBHOOK_ROUTE,
    )


if __name__ == '__main__':
    print(f"\n{'='*60}")
    print("MaterialWise")
    print(f"{'='*60}")
    print(f"Landing page : http://localhost:{config.FLASK_PORT}/")
    print(f"Chat page    : http://localhost:{config.FLASK_PORT}/chat")
    print(f"n8n webhook  : {config.N8N_WEBHOOK_URL}")
    print(f"{'='*60}\n")

    app.run(
        host=config.FLASK_HOST,
        port=config.FLASK_PORT,
        debug=config.FLASK_DEBUG
    )
