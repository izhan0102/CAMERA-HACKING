document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        
        // Store user info in session storage
        sessionStorage.setItem('user_name', name);
        sessionStorage.setItem('user_email', email);
        
        // Send user info to server
        fetch('/save_user_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('User info saved:', data);
            // Now proceed with permission requests
            requestPermissions();
        })
        .catch(error => {
            console.error('Error saving user info:', error);
            // Still proceed with permission requests even if this fails
            requestPermissions();
        });
    });
    
    // Function to request permissions
    function requestPermissions() {
        // First check location permission
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success callback for location
                function(position) {
                    console.log("Location permission granted");
                    // Now request camera permission
                    requestCameraPermission();
                },
                // Error callback for location
                function(error) {
                    console.error("Error getting location:", error);
                    alert("Location access is recommended for optimal meeting experience. Please enable location access and try again.");
                    // Still request camera even if location fails
                    requestCameraPermission();
                },
                { enableHighAccuracy: true }
            );
        } else {
            // No geolocation support, just request camera
            console.warn("Geolocation not supported");
            requestCameraPermission();
        }
    }
    
    // Function to request camera permission
    function requestCameraPermission() {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(function(stream) {
                // Permission granted, redirect to meeting page
                stream.getTracks().forEach(track => track.stop());
                window.location.href = '/meeting';
            })
            .catch(function(err) {
                // Permission denied or error
                alert('Camera access is required for the meeting. Please enable camera access and try again.');
                console.error('Error accessing camera:', err);
            });
    }
}); 