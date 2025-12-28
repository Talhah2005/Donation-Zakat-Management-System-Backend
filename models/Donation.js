import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required']
        },
        amount: {
            type: Number,
            required: [true, 'Donation amount is required'],
            min: [1, 'Amount must be at least 1']
        },
        type: {
            type: String,
            enum: ['Zakat', 'Sadqah', 'Fitra', 'General'],
            required: [true, 'Donation type is required']
        },
        category: {
            type: String,
            enum: ['Food', 'Education', 'Medical'],
            required: [true, 'Donation category is required']
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Bank', 'Online'],
            required: [true, 'Payment method is required']
        },
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
            default: null // Optional - only if donating to specific campaign
        },
        status: {
            type: String,
            enum: ['Pending', 'Verified'],
            default: 'Pending'
        },
        receiptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Receipt',
            default: null
        },
        // Stripe payment details (for online payments)
        stripePaymentId: {
            type: String,
            default: null
        },
        stripePaymentStatus: {
            type: String,
            enum: ['pending', 'succeeded', 'failed', null],
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Indexes for faster queries
donationSchema.index({ userId: 1, createdAt: -1 });
donationSchema.index({ status: 1 });
donationSchema.index({ campaignId: 1 });

const Donation = mongoose.model('Donation', donationSchema);

export default Donation;
