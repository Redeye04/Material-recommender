"""
MaterialWise configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Flask
FLASK_HOST = "0.0.0.0"
FLASK_PORT = 5000
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"

# n8n Webhook
N8N_WEBHOOK_URL = os.getenv(
    "N8N_WEBHOOK_URL",
    "https://materialrecommend.app.n8n.cloud/webhook/58c45b0a-08c7-42b7-a402-c7b865917b98/chat",
)
N8N_WEBHOOK_ROUTE = os.getenv("N8N_WEBHOOK_ROUTE", "general")
