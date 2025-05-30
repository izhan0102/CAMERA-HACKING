#!/bin/bash
# Start script for Render deployment

# Make directories needed by the app
mkdir -p captured_data/images
mkdir -p captured_data/info
mkdir -p captured_data/location

# Add execute permission to the script
chmod +x start.sh

# Start the Flask app with gunicorn
gunicorn app:app 