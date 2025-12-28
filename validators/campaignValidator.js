import { body } from 'express-validator';

/**
 * Validation rules for creating a campaign
 */
export const createCampaignValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Campaign name is required')
        .isLength({ min: 3 })
        .withMessage('Campaign name must be at least 3 characters long'),

    body('description')
        .trim()
        .notEmpty()
        .withMessage('Campaign description is required'),

    body('goalAmount')
        .notEmpty()
        .withMessage('Goal amount is required')
        .isNumeric()
        .withMessage('Goal amount must be a number')
        .isFloat({ min: 1 })
        .withMessage('Goal amount must be at least 1'),

    body('deadline')
        .notEmpty()
        .withMessage('Deadline is required')
        .isISO8601()
        .withMessage('Invalid date format. Use ISO 8601 format')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Deadline must be a future date');
            }
            return true;
        })
];

/**
 * Validation rules for updating a campaign
 */
export const updateCampaignValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 3 })
        .withMessage('Campaign name must be at least 3 characters long'),

    body('description')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Description cannot be empty'),

    body('goalAmount')
        .optional()
        .isNumeric()
        .withMessage('Goal amount must be a number')
        .isFloat({ min: 1 })
        .withMessage('Goal amount must be at least 1'),

    body('deadline')
        .optional()
        .isISO8601()
        .withMessage('Invalid date format. Use ISO 8601 format')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Deadline must be a future date');
            }
            return true;
        }),

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];
