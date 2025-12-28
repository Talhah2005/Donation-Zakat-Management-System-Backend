import Stripe from 'stripe';
import dotenv from 'dotenv';
import Donation from '../models/Donation.js';
import Campaign from '../models/Campaign.js';
import User from '../models/User.js';
import Receipt from '../models/Receipt.js';
import mongoose from 'mongoose';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Create Stripe checkout session for donation payment
 * @route   POST /api/payment/create-checkout-session
 * @access  Private
 */
export const createCheckoutSession = async (req, res) => {
    try {
        const { amount, donationData, campaignId } = req.body;

        if (!amount || amount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // Stripe requires minimum $0.50 USD (~140 PKR)
        // Adding buffer to ensure it always meets requirement
        const MINIMUM_AMOUNT_PKR = 150;
        if (amount < MINIMUM_AMOUNT_PKR) {
            return res.status(400).json({
                success: false,
                message: `Minimum donation amount for online/bank payment is Rs. ${MINIMUM_AMOUNT_PKR}. For smaller amounts, please use Cash payment method.`
            });
        }

        // Create checkout session (use card for both online and bank transfers)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], // Credit/debit cards
            line_items: [
                {
                    price_data: {
                        currency: 'pkr',
                        product_data: {
                            name: `Donation - ${donationData.type}`,
                            description: `Category: ${donationData.category}`,
                        },
                        unit_amount: Math.round(amount * 100), // Convert to paisa
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `http://localhost:5173/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:5173/campaigns?canceled=true`,
            metadata: {
                userId: req.user._id.toString(),
                campaignId: campaignId || '',
                donationType: donationData.type,
                donationCategory: donationData.category,
                paymentMethod: donationData.paymentMethod,
                amount: amount.toString()
            }
        });

        res.status(200).json({
            success: true,
            data: {
                sessionId: session.id,
                url: session.url
            }
        });
    } catch (error) {
        console.error('Stripe Checkout Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error creating payment session',
            error: error.message
        });
    }
};

/**
 * @desc    Create Stripe payment intent for online donation
 * @route   POST /api/payment/create-intent
 * @access  Private
 */
export const createPaymentIntent = async (req, res) => {
    try {
        const { amount, donationId } = req.body;

        if (!amount || amount < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe uses smallest currency unit (cents/paisa)
            currency: 'pkr', // Pakistani Rupees
            metadata: {
                donationId: donationId || 'pending',
                userId: req.user._id.toString()
            }
        });

        res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating payment intent',
            error: error.message
        });
    }
};

/**
 * @desc    Helper to fulfill a checkout session (shared by webhook and manual confirm)
 */
const fulfillCheckoutSession = async (session) => {
    const meta = session.metadata;

    if (!meta || !meta.userId) {
        throw new Error('No metadata found in session');
    }

    // Check if already fulfilled (deduplication)
    const existingDonation = await Donation.findOne({ stripePaymentId: session.payment_intent });
    if (existingDonation) {
        return existingDonation;
    }

    // Create the donation record
    const newDonation = await Donation.create({
        userId: meta.userId,
        campaignId: meta.campaignId && mongoose.Types.ObjectId.isValid(meta.campaignId) ? meta.campaignId : null,
        amount: parseFloat(meta.amount),
        type: meta.donationType,
        category: meta.donationCategory,
        paymentMethod: meta.paymentMethod,
        status: 'Verified',
        stripePaymentId: session.payment_intent,
        stripePaymentStatus: 'succeeded'
    });

    // Update campaign amount if applicable
    if (newDonation.campaignId) {
        await Campaign.findByIdAndUpdate(newDonation.campaignId, {
            $inc: { currentAmount: newDonation.amount }
        });
    }

    // Generate Receipt
    const donor = await User.findById(meta.userId);
    const receiptNumber = `RCP-${Date.now()}-${newDonation._id.toString().slice(-6).toUpperCase()}`;

    const newReceipt = await Receipt.create({
        donationId: newDonation._id,
        receiptNumber,
        donorName: donor ? donor.name : 'Unknown Donor',
        amount: newDonation.amount,
        date: new Date(),
        donationType: newDonation.type,
        donationCategory: newDonation.category
    });

    // Link receipt to donation
    newDonation.receiptId = newReceipt._id;
    await newDonation.save();

    console.log(`✅ Donation fulfilled: ${newDonation._id}`);
    return newDonation.populate('campaignId receiptId');
};

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/payment/webhook
 * @access  Public (Stripe webhook)
 */
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;

            // Update donation status for existing donations (PaymentIntent flow)
            const donationId = paymentIntent.metadata.donationId;

            if (donationId && donationId !== 'pending') {
                await Donation.findByIdAndUpdate(donationId, {
                    status: 'Verified',
                    stripePaymentId: paymentIntent.id,
                    stripePaymentStatus: 'succeeded'
                });

                console.log(`✅ Payment succeeded for donation: ${donationId}`);
            }
            break;

        case 'checkout.session.completed':
            const session = event.data.object;
            try {
                await fulfillCheckoutSession(session);
            } catch (error) {
                console.error('❌ Webhook fulfillment error:', error.message);
            }
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            const failedDonationId = failedPayment.metadata.donationId;

            if (failedDonationId && failedDonationId !== 'pending') {
                await Donation.findByIdAndUpdate(failedDonationId, {
                    stripePaymentId: failedPayment.id,
                    stripePaymentStatus: 'failed'
                });

                console.log(`❌ Payment failed for donation: ${failedDonationId}`);
            }
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
};

/**
 * @desc    Confirm checkout session and fulfill if not already done
 * @route   POST /api/payment/confirm-checkout
 * @access  Private
 */
export const confirmCheckoutSession = async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        // Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const donation = await fulfillCheckoutSession(session);
            res.status(200).json({
                success: true,
                message: 'Donation confirmed successfully',
                data: {
                    donation
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment not completed',
                paymentStatus: session.payment_status
            });
        }
    } catch (error) {
        console.error('Confirm Checkout Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error confirming checkout',
            error: error.message
        });
    }
};

/**
 * @desc    Confirm payment success and update donation
 * @route   POST /api/payment/confirm
 * @access  Private
 */
export const confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, donationId } = req.body;

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            // Update donation
            const donation = await Donation.findByIdAndUpdate(
                donationId,
                {
                    status: 'Verified',
                    stripePaymentId: paymentIntentId,
                    stripePaymentStatus: 'succeeded'
                },
                { new: true }
            ).populate('campaignId receiptId');

            res.status(200).json({
                success: true,
                message: 'Payment confirmed successfully',
                data: {
                    donation
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Payment not successful',
                paymentStatus: paymentIntent.status
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error confirming payment',
            error: error.message
        });
    }
};
