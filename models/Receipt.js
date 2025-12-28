import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
    {
        donationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Donation',
            required: [true, 'Donation ID is required'],
            unique: true
        },
        receiptNumber: {
            type: String,
            required: [true, 'Receipt number is required'],
            unique: true
        },
        donorName: {
            type: String,
            required: [true, 'Donor name is required']
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: 1
        },
        date: {
            type: Date,
            required: [true, 'Receipt date is required'],
            default: Date.now
        },
        donationType: {
            type: String,
            enum: ['Zakat', 'Sadqah', 'Fitra', 'General'],
            required: true
        },
        donationCategory: {
            type: String,
            enum: ['Food', 'Education', 'Medical'],
            required: true
        },
        pdfUrl: {
            type: String,
            default: null // Optional: if we store PDFs in cloud storage
        }
    },
    {
        timestamps: true
    }
);

// Note: Indexes for receiptNumber and donationId are automatically created by unique: true property

const Receipt = mongoose.model('Receipt', receiptSchema);

export default Receipt;
