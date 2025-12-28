import express from 'express';
import {
    createDonation,
    getAllDonations,
    getUserDonations,
    updateDonationStatus,
    getDonationById
} from '../controllers/donationController.js';
import { createDonationValidation, updateDonationStatusValidation } from '../validators/donationValidator.js';
import { validate } from '../middleware/validationMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin, isAuthorized } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create donation (any authenticated user)
router.post('/', createDonationValidation, validate, createDonation);

// Get all donations (admin only)
router.get('/', isAdmin, getAllDonations);

// Get donation by ID
router.get('/:id', getDonationById);

// Get donations by user ID (user can only see their own, admin can see any)
router.get('/user/:userId', isAuthorized('userId'), getUserDonations);

// Update donation status (admin only)
router.patch('/:id/status', isAdmin, updateDonationStatusValidation, validate, updateDonationStatus);

export default router;
