let stripeClient = null;
let elements = null;
let paymentElement = null;

const CART_KEY = 'dos_cart';

const signupForm = document.querySelector('#signup-form');
const contactForm = document.querySelector('#contact-form');
const productGrid = document.querySelector('#product-grid');
const cartContainer = document.querySelector('#cart-container');
const checkoutForm = document.querySelector('#checkout-form');
const paymentForm = document.querySelector('#payment-form');
const orderSummary = document.querySelector('#order-summary');
const confirmationContainer = document.querySelector('#confirmation-container');

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((total, item) => total + Number(item.quantity || 1), 0);
  document.querySelectorAll('[data-cart-count]').forEach((node) => {
    node.textContent = count;
  });
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function loadStripeClient() {
  if (stripeClient) return stripeClient;

  const response = await fetch('/api/config');
  const config = await response.json();

  if (!config.publishableKey) {
    throw new Error('Stripe publishable key is missing. Add STRIPE_PUBLISHABLE_KEY to your environment.');
  }

  stripeClient = Stripe(config.publishableKey);
  return stripeClient;
}

async function fetchProducts() {
  const response = await fetch('/api/products');
  const data = await response.json();
  if (!data.success) throw new Error('Unable to load products');
  return data.products;
}

function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    cart.push({ id: productId, quantity: Number(quantity) });
  }

  saveCart(cart);
  alert('Added to cart.');
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  renderCart();
}

function updateQuantity(productId, quantity) {
  const cart = getCart().map((item) => {
    if (item.id === productId) {
      return { ...item, quantity: Math.max(1, Number(quantity || 1)) };
    }
    return item;
  });
  saveCart(cart);
  renderCart();
}

async function renderProducts() {
  if (!productGrid) return;

  try {
    const products = await fetchProducts();
    productGrid.innerHTML = products.map((product) => `
      <article class="product-card">
        <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.style.display='none'" />
        <div class="product-body">
          <p class="badge">${product.category}</p>
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="product-meta">
            <strong>${formatMoney(product.price)}</strong>
            <span>${product.inventory} available</span>
          </div>
          <button class="btn" data-add-to-cart="${product.id}">Add to Cart</button>
        </div>
      </article>
    `).join('');

    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
      button.addEventListener('click', () => addToCart(button.dataset.addToCart));
    });
  } catch (error) {
    productGrid.innerHTML = `<p class="notice error">${error.message}</p>`;
  }
}

async function buildCartDetails() {
  const cart = getCart();
  const products = await fetchProducts();
  const lines = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    if (!product) return null;
    const quantity = Number(item.quantity || 1);
    const lineTotal = product.price * quantity;
    return { ...product, quantity, lineTotal };
  }).filter(Boolean);

  const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = 0;
  const shipping = 0;
  const total = subtotal + tax + shipping;

  return { lines, totals: { subtotal, tax, shipping, total } };
}

async function renderCart() {
  if (!cartContainer) return;

  const details = await buildCartDetails();

  if (details.lines.length === 0) {
    cartContainer.innerHTML = '<p class="notice">Your cart is empty. <a href="/products.html">Browse products</a>.</p>';
    return;
  }

  cartContainer.innerHTML = `
    <div class="cart-list">
      ${details.lines.map((item) => `
        <div class="cart-line">
          <div>
            <h3>${item.name}</h3>
            <p>${formatMoney(item.price)} each</p>
          </div>
          <div class="quantity-control">
            <label for="qty-${item.id}">Qty</label>
            <input id="qty-${item.id}" type="number" min="1" value="${item.quantity}" data-quantity="${item.id}" />
          </div>
          <strong>${formatMoney(item.lineTotal)}</strong>
          <button class="btn btn-light" data-remove="${item.id}">Remove</button>
        </div>
      `).join('')}
    </div>
    <div class="summary-card">
      <p><span>Subtotal</span><strong>${formatMoney(details.totals.subtotal)}</strong></p>
      <p><span>Tax</span><strong>${formatMoney(details.totals.tax)}</strong></p>
      <p><span>Shipping</span><strong>${formatMoney(details.totals.shipping)}</strong></p>
      <p class="summary-total"><span>Total</span><strong>${formatMoney(details.totals.total)}</strong></p>
      <a class="btn btn-primary" href="/checkout.html">Checkout</a>
    </div>
  `;

  document.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => removeFromCart(button.dataset.remove));
  });

  document.querySelectorAll('[data-quantity]').forEach((input) => {
    input.addEventListener('change', () => updateQuantity(input.dataset.quantity, input.value));
  });
}

async function renderCheckoutSummary() {
  if (!orderSummary) return null;

  const details = await buildCartDetails();

  if (details.lines.length === 0) {
    orderSummary.innerHTML = '<p class="notice">Your cart is empty. <a href="/products.html">Browse products</a>.</p>';
    if (checkoutForm) checkoutForm.style.display = 'none';
    if (paymentForm) paymentForm.style.display = 'none';
    return null;
  }

  orderSummary.innerHTML = `
    <h2>Order Summary</h2>
    ${details.lines.map((item) => `
      <p><span>${item.name} x ${item.quantity}</span><strong>${formatMoney(item.lineTotal)}</strong></p>
    `).join('')}
    <p><span>Subtotal</span><strong>${formatMoney(details.totals.subtotal)}</strong></p>
    <p><span>Tax</span><strong>${formatMoney(details.totals.tax)}</strong></p>
    <p><span>Shipping</span><strong>${formatMoney(details.totals.shipping)}</strong></p>
    <p class="summary-total"><span>Total</span><strong>${formatMoney(details.totals.total)}</strong></p>
  `;

  return details;
}

async function createOrderAndMountPaymentElement(event) {
  event.preventDefault();

  const submitButton = checkoutForm.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  showLoading(submitButton, 'Preparing payment...');

  try {
    const details = await buildCartDetails();
    if (details.lines.length === 0) throw new Error('Your cart is empty.');

    const formData = new FormData(checkoutForm);
    const customer = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: {
        line1: formData.get('address1'),
        line2: formData.get('address2'),
        city: formData.get('city'),
        state: formData.get('state'),
        postal_code: formData.get('postal_code'),
        country: formData.get('country') || 'US'
      }
    };

    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        items: getCart()
      })
    });
    const orderData = await orderResponse.json();
    if (!orderData.success) throw new Error(orderData.message || 'Unable to create order');

    const intentResponse = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.order.id,
        customerEmail: customer.email
      })
    });
    const intentData = await intentResponse.json();
    if (!intentData.success) throw new Error(intentData.error || intentData.message || 'Unable to create payment');

    const stripe = await loadStripeClient();
    elements = stripe.elements({
      clientSecret: intentData.clientSecret,
      appearance: {
        theme: 'stripe'
      }
    });

    paymentElement = elements.create('payment', {
      layout: 'tabs'
    });
    paymentElement.mount('#payment-element');

    document.querySelector('#order-id').value = orderData.order.id;
    checkoutForm.style.display = 'none';
    paymentForm.style.display = 'block';
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading(submitButton, originalText);
  }
}

async function confirmPayment(event) {
  event.preventDefault();

  const submitButton = paymentForm.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  showLoading(submitButton, 'Processing payment...');

  try {
    const stripe = await loadStripeClient();
    const orderId = document.querySelector('#order-id').value;
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success.html?order_id=${encodeURIComponent(orderId)}`
      }
    });

    if (result.error) {
      document.querySelector('#payment-message').textContent = result.error.message;
    }
  } catch (error) {
    document.querySelector('#payment-message').textContent = error.message;
  } finally {
    hideLoading(submitButton, originalText);
  }
}

async function renderConfirmation() {
  if (!confirmationContainer) return;

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');
  const paymentIntentClientSecret = params.get('payment_intent_client_secret');

  if (!paymentIntentClientSecret) {
    confirmationContainer.innerHTML = '<p class="notice">No payment confirmation was found.</p>';
    return;
  }

  try {
    const stripe = await loadStripeClient();
    const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

    let message = 'Your payment is being processed.';
    if (paymentIntent.status === 'succeeded') {
      message = 'Payment successful. Your order has been received.';
      localStorage.removeItem(CART_KEY);
      updateCartCount();
    } else if (paymentIntent.status === 'processing') {
      message = 'Payment processing. ACH bank payments can take several business days to fully settle.';
    } else if (paymentIntent.status === 'requires_payment_method') {
      message = 'Payment was not completed. Please try again with another payment method.';
    }

    confirmationContainer.innerHTML = `
      <div class="summary-card">
        <h2>${message}</h2>
        <p><strong>Order:</strong> ${orderId || 'Not available'}</p>
        <p><strong>Payment status:</strong> ${paymentIntent.status}</p>
        <a class="btn btn-primary" href="/products.html">Continue Shopping</a>
      </div>
    `;
  } catch (error) {
    confirmationContainer.innerHTML = `<p class="notice error">${error.message}</p>`;
  }
}

function setupEventListeners() {
  if (signupForm) signupForm.addEventListener('submit', handleSignup);
  if (contactForm) contactForm.addEventListener('submit', handleContact);
  if (checkoutForm) checkoutForm.addEventListener('submit', createOrderAndMountPaymentElement);
  if (paymentForm) paymentForm.addEventListener('submit', confirmPayment);
}

async function handleSignup(e) {
  e.preventDefault();
  const formData = new FormData(signupForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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

function showLoading(element, text = 'Loading...') {
  element.disabled = true;
  element.textContent = text;
}

function hideLoading(element, text) {
  element.disabled = false;
  element.textContent = text;
}

document.addEventListener('DOMContentLoaded', async function() {
  updateCartCount();
  setupEventListeners();
  await renderProducts();
  await renderCart();
  await renderCheckoutSummary();
  await renderConfirmation();
});
