import express from 'express';
import {
    createCampaign,
    getAllCampaigns,
    getActiveCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign
} from '../controllers/campaignController.js';
import { createCampaignValidation, updateCampaignValidation } from '../validators/campaignValidator.js';
import { validate } from '../middleware/validationMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCampaigns);
router.get('/:id', getCampaignById);

// Protected routes (require authentication)
router.get('/', authenticate, getAllCampaigns);

// Admin only routes
router.post('/', authenticate, isAdmin, createCampaignValidation, validate, createCampaign);
router.patch('/:id', authenticate, isAdmin, updateCampaignValidation, validate, updateCampaign);
router.delete('/:id', authenticate, isAdmin, deleteCampaign);

export default router;
