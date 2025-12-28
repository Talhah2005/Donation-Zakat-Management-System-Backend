import express from 'express';
import { getReceiptByDonation, downloadReceipt } from '../controllers/receiptController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Logging middleware for receipt routes
router.use((req, res, next) => {
    console.log(`\n🧾 Receipt Route: ${req.method} ${req.originalUrl}`);
    console.log(`👤 User: ${req.user?.name || 'Not authenticated yet'}`);
    console.log(`📍 Params:`, req.params);
    next();
});

// All routes require authentication
router.use(authenticate);

// Get receipt by donation ID
router.get('/donation/:donationId', (req, res, next) => {
    console.log('📋 Fetching receipt by donation ID:', req.params.donationId);
    next();
}, getReceiptByDonation);

// Download receipt as PDF
router.get('/download/:receiptId', (req, res, next) => {
    console.log('📥 Downloading PDF for receipt ID:', req.params.receiptId);
    next();
}, downloadReceipt);

export default router;