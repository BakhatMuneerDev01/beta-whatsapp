import { body, validationResult } from 'express-validator';

// Validation rules for user authentication
export const validateSignup = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),

    body('fullName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .escape()
        .withMessage('Full name must be between 2 and 50 characters'),

    body('bio')
        .trim()
        .isLength({ max: 500 })
        .escape()
        .withMessage('Bio must not exceed 500 characters')
];

// Validation rules for login
export const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Validation rules for messages
// MODIFIED: Updated image validation to handle both base64 strings and placeholder values
export const validateMessage = [
    body('text')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .escape()
        .withMessage('Message text must not exceed 1000 characters'),

    body('image')
        .optional()
        .custom((value) => {
            // Allow base64 strings, data URLs, or the 'uploading' placeholder
            if (value === 'uploading' || value === null || value === undefined) {
                return true;
            }
            if (typeof value === 'string' && (value.startsWith('data:image') || value.length > 100)) {
                return true;
            }
            throw new Error('Image must be a valid base64 string or data URL');
        })
        .withMessage('Image must be a valid base64 string or data URL')
];

// MODIFIED: Updated profile validation
export const validateProfile = [
    body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .escape()
        .withMessage('Full name must be between 2 and 50 characters'),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .escape()
        .withMessage('Bio must not exceed 500 characters'),

    body('profilePic')
        .optional()
        .custom((value) => {
            // Allow base64 strings, data URLs, or the 'uploading' placeholder
            if (value === 'uploading' || value === null || value === undefined) {
                return true;
            }
            if (typeof value === 'string' && (value.startsWith('data:image') || value.length > 100)) {
                return true;
            }
            throw new Error('Profile picture must be a valid base64 string or data URL');
        })
        .withMessage('Profile picture must be a valid base64 string or data URL')
];

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};