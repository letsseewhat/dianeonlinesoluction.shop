# Diane Online Solution - E-Commerce Platform

A modern e-commerce platform built with Node.js and Stripe integration for seamless payment processing.

## Features

- 🛒 Complete e-commerce shopping experience
- 💳 Stripe payment integration
- 👤 Customer management system
- 📊 Dashboard for analytics
- 🔒 Secure transactions
- 📱 Responsive design
- 📋 Policy pages (Terms, Privacy, Refund)
- ✉️ Contact and support system

## Project Structure

```
.
├── public/              # Frontend static files
│   ├── assets/         # CSS and JavaScript
│   ├── index.html      # Homepage
│   ├── pricing.html    # Pricing page
│   ├── dashboard.html  # User dashboard
│   ├── signup.html     # Sign-up page
│   ├── contact.html    # Contact page
│   └── ...             # Policy pages
├── data/               # Data storage
│   ├── customers.json  # Customer data
│   └── events.log      # Event logs
├── server.js           # Main server file
├── package.json        # Node.js dependencies
├── .env.example        # Environment variables template
├── DEPLOYMENT.md       # Deployment instructions
├── WEBHOOK_SETUP.md    # Stripe webhook setup
└── README.md           # This file
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Stripe account (for payment processing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/letsseewhat/dianeonlinesoluction.shop.git
   cd dianeonlinesoluction.shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Stripe keys and configuration:
   ```
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:3000`

## Available Pages

- **Homepage** (`/`) - Main landing page
- **Pricing** (`/pricing.html`) - Pricing plans
- **Dashboard** (`/dashboard.html`) - User dashboard
- **Sign Up** (`/signup.html`) - New customer registration
- **Contact** (`/contact.html`) - Contact form
- **Terms & Conditions** - Terms of service
- **Privacy Policy** - Data privacy information
- **Refund Policy** - Refund guidelines
- **Acceptable Use** - Usage policies

## Configuration

### Stripe Setup

1. Sign up at [Stripe](https://stripe.com)
2. Get your API keys from the dashboard
3. Add keys to `.env` file
4. Set up webhooks as described in `WEBHOOK_SETUP.md`

### Database Setup

Customer data is stored in `data/customers.json`. For production, consider migrating to a proper database like MongoDB or PostgreSQL.

## Deployment

See `DEPLOYMENT.md` for detailed deployment instructions for:
- Heroku
- AWS
- DigitalOcean
- Azure
- Other hosting platforms

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Payment
- `POST /api/payment` - Process payment
- `POST /api/webhook` - Stripe webhook handler

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer

## Security Considerations

- Always use HTTPS in production
- Keep Stripe secret keys secure (never commit to repository)
- Validate all user inputs on both client and server
- Use environment variables for sensitive data
- Enable Stripe webhooks for real-time event handling

## Testing

For development and testing:
- Use Stripe's test API keys (starting with `pk_test_` and `sk_test_`)
- Use Stripe test card numbers for transactions
- Monitor webhook events in Stripe dashboard

## Troubleshooting

### Port Already in Use
```bash
# Change port in .env or use:
PORT=3001 npm start
```

### Stripe Connection Issues
- Verify API keys in `.env`
- Check Stripe account status
- Review webhook configuration

### Static Files Not Loading
- Ensure `public/` folder exists
- Check file paths in HTML
- Clear browser cache

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For support, contact us via:
- Email: support@dianeonlinesoluction.shop
- Contact form: `/contact.html`
- Issues: [GitHub Issues](https://github.com/letsseewhat/dianeonlinesoluction.shop/issues)

## Roadmap

- [ ] Admin dashboard
- [ ] Inventory management
- [ ] Email notifications
- [ ] Multi-currency support
- [ ] Advanced analytics
- [ ] Mobile app
- [ ] Subscription management
- [ ] User reviews and ratings

---

**Last Updated:** 2026-07-05