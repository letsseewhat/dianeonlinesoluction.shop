# Stripe Webhook Setup Guide

This guide explains how to set up Stripe webhooks for your Diane Online Solution platform.

## What are Webhooks?

Webhooks are HTTP callbacks that Stripe sends to your server when events occur (e.g., payment success, subscription renewal).

## Setup Steps

### 1. Configure Webhook Endpoint

#### Development (Local Testing)

Use Stripe CLI for local webhook testing:

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhook events to local server
stripe listen --forward-to localhost:3000/api/webhook
```

This will output:
```
Ready! Your webhook signing secret is: whsec_test_...
```

Add to your `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

#### Production Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL:
   ```
   https://yourdomain.com/api/webhook
   ```
5. Select events to listen for:
   - `charge.succeeded`
   - `charge.failed`
   - `customer.created`
   - `customer.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

6. Click **Add endpoint**
7. Copy the signing secret and add to your `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_live_...
   ```

### 2. Implement Webhook Handler

Add to your `server.js`:

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.sendStatus(400);
  }

  // Handle different event types
  switch (event.type) {
    case 'charge.succeeded':
      handleChargeSucceeded(event.data.object);
      break;
    case 'charge.failed':
      handleChargeFailed(event.data.object);
      break;
    case 'customer.created':
      handleCustomerCreated(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

function handleChargeSucceeded(charge) {
  console.log(`Charge succeeded: ${charge.id}`);
  // Update order status in database
  // Send confirmation email
  // Update customer records
}

function handleChargeFailed(charge) {
  console.log(`Charge failed: ${charge.id}`);
  // Notify customer
  // Log payment failure
}

function handleCustomerCreated(customer) {
  console.log(`Customer created: ${customer.id}`);
  // Add to database
}
```

### 3. Event Types to Handle

#### Payment Events
- `charge.succeeded` - Payment completed
- `charge.failed` - Payment failed
- `charge.refunded` - Payment refunded
- `charge.captured` - Payment captured

#### Customer Events
- `customer.created` - New customer
- `customer.updated` - Customer updated
- `customer.deleted` - Customer deleted

#### Invoice Events
- `invoice.created` - Invoice created
- `invoice.paid` - Invoice paid
- `invoice.payment_failed` - Invoice payment failed

#### Subscription Events
- `customer.subscription.created` - Subscription started
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled

### 4. Security Best Practices

1. **Verify webhook signature** (required)
   ```javascript
   stripe.webhooks.constructEvent(req.body, sig, secret);
   ```

2. **Use HTTPS only** in production

3. **Idempotency** - Handle duplicate events
   ```javascript
   const eventId = event.id;
   // Check if event already processed
   if (processedEvents.has(eventId)) return res.json({received: true});
   // Process event
   processedEvents.add(eventId);
   ```

4. **Rate limiting** - Implement rate limits

5. **Logging** - Log all webhook events

### 5. Testing

#### Using Stripe CLI
```bash
# Test specific event
stripe trigger charge.succeeded

# Test with data
stripe trigger charge.succeeded --add charge.amount=5000
```

#### Manual Testing
1. Make a test payment in your application
2. Check Stripe Dashboard → Events
3. Verify your server received the webhook
4. Check server logs

### 6. Troubleshooting

#### Webhook Not Being Received
- Verify endpoint URL is correct
- Check firewall/security settings
- Ensure server is publicly accessible
- Check Stripe Dashboard → Webhooks → Endpoint Details

#### Signature Verification Failed
- Verify webhook secret is correct
- Ensure using raw request body (not parsed JSON)
- Check webhook secret matches endpoint configuration

#### Events Not Processing
- Check server logs
- Verify event handler exists for event type
- Check database connectivity
- Review error handling

### 7. Monitoring

Stripe Dashboard shows:
- All webhook deliveries
- Delivery status (success/failure)
- Response status codes
- Timestamp of delivery
- Event details

Recommended practices:
- Monitor failed deliveries
- Set up alerts for failures
- Log all webhook events
- Review events regularly

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Guide](https://stripe.com/docs/stripe-cli)
- [Event Types Reference](https://stripe.com/docs/api/events/types)
