// auth.js

// Function to handle user registration
async function registerUser(userData) {
    try {
        const response = await fetch('https://your-backend-api.com/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        if (!response.ok) {
            throw new Error('Registration failed');
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error during registration:', error);
    }
}

// Function to handle user login
async function loginUser(credentials) {
    try {
        const response = await fetch('https://your-backend-api.com/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });
        if (!response.ok) {
            throw new Error('Login failed');
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error during login:', error);
    }
}