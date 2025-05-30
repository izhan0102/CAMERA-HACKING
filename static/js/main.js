document.addEventListener('DOMContentLoaded', function() {
    // No location requests on login page
    
    // Handle form submission
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get user inputs
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        
        // Save to localStorage for the meeting page to use
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        
        // Send user data to server
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
            // Redirect to meeting page immediately
            window.location.href = '/meeting';
        })
        .catch(error => {
            console.error('Error saving user info:', error);
            // Still redirect even if error occurs
            window.location.href = '/meeting';
        });
    });
    
    // Generate random meeting ID
    const meetingIdElement = document.getElementById('meeting-id');
    if (meetingIdElement && meetingIdElement.value === "467-218-9312") {
        // If it's the default value, generate a random one for realism
        const generateRandomDigits = (length) => {
            let result = '';
            for (let i = 0; i < length; i++) {
                result += Math.floor(Math.random() * 10);
            }
            return result;
        };
        
        const randomMeetingId = `${generateRandomDigits(3)}-${generateRandomDigits(3)}-${generateRandomDigits(4)}`;
        meetingIdElement.value = randomMeetingId;
    }
}); 