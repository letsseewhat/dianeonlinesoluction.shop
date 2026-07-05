// Stripe Configuration
const stripe = Stripe('YOUR_STRIPE_PUBLIC_KEY');

// DOM Elements
const signupForm = document.querySelector('#signup-form');
const contactForm = document.querySelector('#contact-form');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initialized');
    setupEventListeners();
});

function setupEventListeners() {
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    if (contactForm) {
        contactForm.addEventListener('submit', handleContact);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(signupForm);
    
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            alert('Sign up successful! Redirecting to dashboard...');
            window.location.href = '/dashboard.html';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
}

async function handleContact(e) {
    e.preventDefault();
    const formData = new FormData(contactForm);
    
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            alert('Message sent successfully!');
            contactForm.reset();
        } else {
            alert('Error sending message');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred');
    }
}

async function processPayment(amount) {
    try {
        const response = await fetch('/api/payment', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({amount})
        });
        const {clientSecret} = await response.json();
        
        const result = await stripe.confirmCardPayment(clientSecret);
        if (result.error) {
            alert('Payment failed: ' + result.error.message);
        } else {
            alert('Payment successful!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Utility functions
function showLoading(element) {
    element.disabled = true;
    element.textContent = 'Loading...';
}

function hideLoading(element, text) {
    element.disabled = false;
    element.textContent = text;
}
