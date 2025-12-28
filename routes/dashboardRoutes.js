import express from 'express';
import { getUserDashboard, getAdminDashboard, getAllDonors } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { isAdmin, isAuthorized } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User dashboard (user can only see their own, admin can see any)
router.get('/user/:userId', isAuthorized('userId'), getUserDashboard);

// Admin dashboard (admin only)
router.get('/admin', isAdmin, getAdminDashboard);

// Get all donors with summary (admin only)
router.get('/admin/donors', isAdmin, getAllDonors);

export default router;
