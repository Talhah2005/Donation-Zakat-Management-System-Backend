import express from 'express';
import { createPaymentIntent, handleStripeWebhook, confirmPayment, createCheckoutSession, confirmCheckoutSession } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Webhook route (no authentication, Stripe verifies via signature)
// IMPORTANT: This must use raw body, not JSON parsed body
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Protected routes
router.post('/create-checkout-session', authenticate, createCheckoutSession);
router.post('/create-intent', authenticate, createPaymentIntent);
router.post('/confirm', authenticate, confirmPayment);
router.post('/confirm-checkout', authenticate, confirmCheckoutSession);

export default router;
