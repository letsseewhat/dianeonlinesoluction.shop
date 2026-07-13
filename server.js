const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Load environment variables before configuring Stripe
dotenv.config();

const { PostHog, setupExpressRequestContext, setupExpressErrorHandler } = require('posthog-node');

const posthog = new PostHog(process.env.POSTHOG_API_KEY, {
  host: process.env.POSTHOG_HOST,
  enableExceptionAutocapture: true,
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const app = express();
const PORT = process.env.PORT || 3000;

const products = [
  {
    id: 'consulting-starter',
    name: 'Online Business Starter Consultation',
    category: 'Services',
    price: 149.00,
    image: '/assets/product-service.svg',
    description: 'A practical one-on-one online consultation for business setup, payment readiness, and website planning.',
    featured: true,
    inventory: 20
  },
  {
    id: 'digital-template-pack',
    name: 'Digital Business Template Pack',
    category: 'Digital Products',
    price: 39.00,
    image: '/assets/product-digital.svg',
    description: 'Downloadable templates for invoices, customer intake, service descriptions, and policy drafts.',
    featured: true,
    inventory: 100
  },
  {
    id: 'website-review',
    name: 'Website Review Report',
    category: 'Services',
    price: 89.00,
    image: '/assets/product-report.svg',
    description: 'A written review of your website structure, trust signals, payment readiness, and customer flow.',
    featured: false,
    inventory: 25
  }
];

const orders = [];

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

function calculateOrderTotals(items) {
  let subtotal = 0;
  const normalizedItems = items.map((item) => {
    const product = findProduct(item.id || item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.id || item.productId}`);
    }

    const quantity = Math.max(1, Number(item.quantity || 1));
    const lineTotal = Number((product.price * quantity).toFixed(2));
    subtotal += lineTotal;

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      lineTotal
    };
  });

  const tax = 0;
  const shipping = 0;
  const total = Number((subtotal + tax + shipping).toFixed(2));

  return {
    items: normalizedItems,
    totals: {
      subtotal: Number(subtotal.toFixed(2)),
      tax,
      shipping,
      total
    }
  };
}

// Middleware
app.use(cors());
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

setupExpressRequestContext(posthog, app);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Frontend Stripe configuration
app.get('/api/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  });
});

// Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Products Endpoint
app.get('/api/products', (req, res) => {
  res.json({ success: true, products });
});

app.get('/api/products/:id', (req, res) => {
  const product = findProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product });
});

// Order Endpoint
app.post('/api/orders', (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer || !customer.name || !customer.email || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, email, and at least one cart item are required'
      });
    }

    const calculated = calculateOrderTotals(items);

    const order = {
      id: `DOS-${Date.now()}`,
      customer,
      items: calculated.items,
      totals: calculated.totals,
      status: 'pending_payment',
      createdAt: new Date().toISOString()
    };

    orders.push(order);

    posthog.capture({
      distinctId: customer.email,
      event: 'order_created',
      properties: {
        order_id: order.id,
        item_count: calculated.items.length,
        subtotal: calculated.totals.subtotal,
        total: calculated.totals.total,
        product_ids: calculated.items.map((i) => i.id),
        $set: { name: customer.name, email: customer.email },
      },
    });

    res.json({
      success: true,
      message: 'Order created',
      order
    });
  } catch (error) {
    console.error('Order error:', error);
    posthog.captureException(error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/orders', (req, res) => {
  res.json({ success: true, orders });
});

app.get('/api/orders/:id', (req, res) => {
  const order = orders.find((item) => item.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }
  res.json({ success: true, order });
});

// PaymentIntent endpoint for Stripe Payment Element.
// Automatic payment methods lets Stripe show cards, Link, wallets, ACH/bank debit,
// and eligible local payment methods based on your Stripe account settings.
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { orderId, customerEmail } = req.body;
    const order = orders.find((item) => item.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totals.total * 100),
      currency: 'usd',
      receipt_email: customerEmail || order.customer.email,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        order_id: order.id,
        customer_email: order.customer.email,
        source: 'dianeonlinesoluction.shop',
        timestamp: new Date().toISOString()
      }
    });

    order.paymentIntent = paymentIntent.id;
    order.status = 'awaiting_payment_method';

    posthog.capture({
      distinctId: customerEmail || order.customer.email,
      event: 'payment_intent_created',
      properties: {
        order_id: order.id,
        payment_intent_id: paymentIntent.id,
        amount: order.totals.total,
        currency: 'usd',
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
      order
    });
  } catch (error) {
    console.error('PaymentIntent error:', error);
    posthog.captureException(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Backward-compatible Payment Endpoint
app.post('/api/payment', async (req, res) => {
  try {
    const { amount, orderId, customerEmail } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'A valid amount is required' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'usd',
      receipt_email: customerEmail || undefined,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        order_id: orderId || 'pending',
        source: 'dianeonlinesoluction.shop',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook Handler
app.post('/api/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('Stripe webhook secret is not configured.');
    return res.status(400).send('Webhook secret is not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.sendStatus(400);
  }

  console.log(`Webhook received: ${event.type}`);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      const order = orders.find((item) => item.id === intent.metadata.order_id);
      if (order) {
        order.status = 'paid';
        order.paymentIntent = intent.id;
      }
      posthog.capture({
        distinctId: intent.metadata.customer_email || intent.receipt_email || intent.metadata.order_id,
        event: 'payment_succeeded',
        properties: {
          order_id: intent.metadata.order_id,
          payment_intent_id: intent.id,
          amount: intent.amount / 100,
          currency: intent.currency,
        },
      });
      break;
    }
    case 'payment_intent.processing': {
      const intent = event.data.object;
      const order = orders.find((item) => item.id === intent.metadata.order_id);
      if (order) {
        order.status = 'processing';
        order.paymentIntent = intent.id;
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      const order = orders.find((item) => item.id === intent.metadata.order_id);
      if (order) {
        order.status = 'payment_failed';
        order.paymentIntent = intent.id;
      }
      posthog.capture({
        distinctId: intent.metadata.customer_email || intent.receipt_email || intent.metadata.order_id,
        event: 'payment_failed',
        properties: {
          order_id: intent.metadata.order_id,
          payment_intent_id: intent.id,
          amount: intent.amount / 100,
          currency: intent.currency,
          failure_message: intent.last_payment_error && intent.last_payment_error.message,
        },
      });
      break;
    }
    case 'payment_intent.canceled': {
      const intent = event.data.object;
      const order = orders.find((item) => item.id === intent.metadata.order_id);
      if (order) {
        order.status = 'canceled';
        order.paymentIntent = intent.id;
      }
      posthog.capture({
        distinctId: intent.metadata.customer_email || intent.receipt_email || intent.metadata.order_id,
        event: 'payment_canceled',
        properties: {
          order_id: intent.metadata.order_id,
          payment_intent_id: intent.id,
          amount: intent.amount / 100,
          currency: intent.currency,
          cancellation_reason: intent.cancellation_reason,
        },
      });
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Sign Up Endpoint
app.post('/api/signup', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    console.log(`New signup: ${email}`);

    posthog.identify({
      distinctId: email,
      properties: {
        name,
        email,
        $set_once: { first_seen: new Date().toISOString() },
      },
    });

    posthog.capture({
      distinctId: email,
      event: 'user_signed_up',
      properties: {
        name,
        signup_method: 'email',
      },
    });

    res.json({
      success: true,
      message: 'Account created successfully',
      user: { name, email }
    });
  } catch (error) {
    console.error('Signup error:', error);
    posthog.captureException(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Contact Endpoint
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    console.log(`Contact form received from: ${email}`);

    posthog.capture({
      distinctId: email,
      event: 'contact_form_submitted',
      properties: {
        subject,
        $set: { name, email },
      },
    });

    res.json({
      success: true,
      message: 'Message received. We will get back to you soon.'
    });
  } catch (error) {
    console.error('Contact error:', error);
    posthog.captureException(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Customers Endpoint
app.get('/api/customers', (req, res) => {
  try {
    res.json({
      success: true,
      customers: []
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

setupExpressErrorHandler(posthog, app);

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Stripe configured: ${process.env.STRIPE_SECRET_KEY ? 'Yes' : 'No'}`);
});

process.on('SIGINT', async () => {
  await posthog.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await posthog.shutdown();
  process.exit(0);
});
