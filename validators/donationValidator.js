import { body } from 'express-validator';

/**
 * Validation rules for creating a donation
 */
export const createDonationValidation = [
    body('amount')
        .notEmpty()
        .withMessage('Donation amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .isFloat({ min: 1 })
        .withMessage('Amount must be at least 1'),

    body('type')
        .notEmpty()
        .withMessage('Donation type is required')
        .isIn(['Zakat', 'Sadqah', 'Fitra', 'General'])
        .withMessage('Invalid donation type. Must be: Zakat, Sadqah, Fitra, or General'),

    body('category')
        .notEmpty()
        .withMessage('Donation category is required')
        .isIn(['Food', 'Education', 'Medical'])
        .withMessage('Invalid category. Must be: Food, Education, or Medical'),

    body('paymentMethod')
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['Cash', 'Bank', 'Online'])
        .withMessage('Invalid payment method. Must be: Cash, Bank, or Online'),

    body('campaignId')
        .optional()
        .isMongoId()
        .withMessage('Invalid campaign ID')
];

/**
 * Validation rules for updating donation status (admin only)
 */
export const updateDonationStatusValidation = [
    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['Pending', 'Verified'])
        .withMessage('Invalid status. Must be: Pending or Verified')
];
