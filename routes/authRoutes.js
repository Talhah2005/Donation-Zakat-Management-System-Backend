import express from 'express';
import { signup, login, getMe, forgotPassword, resetPassword, verifyEmail } from '../controllers/authController.js';
import { googleAuth } from '../controllers/googleAuthController.js';
import { signupValidation, loginValidation } from '../validators/authValidator.js';
import { validate } from '../middleware/validationMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signupValidation, validate, signup);
router.post('/login', loginValidation, validate, login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;
