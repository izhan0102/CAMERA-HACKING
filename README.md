# Cybersecurity Education Project: Fake Meeting Template

This project demonstrates a phishing technique used in cybersecurity where a fake online meeting platform captures user images and information. **This is for educational purposes only**.

## Disclaimer

This project is strictly for educational purposes as part of a cybersecurity curriculum. It demonstrates how malicious actors might create phishing sites. Do not use this for any malicious or illegal activities.

## Features

- Fake meeting interface that mimics legitimate video conferencing platforms
- Camera access permission request
- Geolocation tracking using browser's geolocation API
- User image capture (limited to 30 images) every 2 seconds
- IP and browser information collection
- Precise location coordinates (latitude/longitude) collection
- Data storage in local folders
- Real-time data forwarding to Telegram

## Requirements

- Python 3.7+
- Flask
- OpenCV
- Pillow
- Geopy (for location processing)
- Python-Telegram-Bot (for Telegram integration)

## Installation

1. Clone this repository
2. Install the requirements:
```
pip install -r requirements.txt
```
3. Configure your Telegram bot:
   - Create a new bot using [BotFather](https://t.me/BotFather) and get your bot token
   - Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot) on Telegram
   - Edit `config.py` with your bot token and chat ID

## Telegram Integration

This project includes integration with Telegram to send captured data in real-time:

1. **Setup Instructions:**
   - Create a Telegram bot through BotFather (https://t.me/BotFather)
   - Copy the provided bot token
   - Get your personal chat ID by messaging @userinfobot on Telegram
   - Update the `config.py` file with your bot token and chat ID

2. **Data Sent to Telegram:**
   - User information (IP, user agent, timestamp)
   - Captured images
   - Location coordinates (both as text and interactive map pins)
   - JSON files with complete data

## Usage

1. Configure Telegram bot credentials in `config.py`
2. Run the application:
```
python app.py
```
3. Open a web browser and navigate to:
```
http://localhost:5000
```
4. The application will:
   - Present a fake meeting login page
   - Request location and camera permissions
   - When granted, redirect to a fake meeting room
   - Capture images (every 2 seconds) and user data (IP, user agent, location, etc.)
   - Store this information in the `captured_data` folder
   - Send the captured data to your Telegram bot

## Project Structure

```
project/
├── app.py                  # Main Flask application
├── config.py               # Configuration for Telegram bot
├── telegram_bot.py         # Telegram integration module
├── requirements.txt        # Python dependencies
├── static/                 # Static files
│   ├── css/
│   │   └── style.css       # CSS styles
│   └── js/
│       ├── main.js         # Login page JavaScript
│       └── meeting.js      # Meeting page JavaScript
├── templates/              # HTML templates
│   ├── index.html          # Login page
│   └── meeting.html        # Meeting room page
└── captured_data/          # Folder for storing captured data
    ├── images/             # Captured images
    ├── location/           # Location data
    └── info/               # User information
```

## Location Data

The application collects precise location data using the browser's Geolocation API, which includes:
- Latitude and longitude coordinates (can be used in Google Maps)
- Accuracy level of the coordinates
- Timestamp of when location was captured

Location data is stored in JSON format in the `captured_data/location` directory and is also sent to Telegram.

## Educational Value

This project demonstrates:
1. How easy it is to create convincing phishing sites
2. The importance of being cautious when granting camera and location permissions
3. How user data can be captured without awareness
4. Techniques used in social engineering attacks
5. How captured data can be forwarded to remote services

## Ethical Considerations

This tool should only be used in controlled environments with proper authorization, such as:
- Cybersecurity courses
- Security awareness training
- Educational demonstrations

Never deploy this on public servers or use it against individuals without explicit consent. 