import { body, validationResult } from "express-validator";

import { body, validationResult } from 'express-validator';

// Validation rules for user authentication
export const validateAuth = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
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
    .withMessage('Bio must not exceed 500 characters')
];

// Validation rules for messages
export const validateMessage = [
  body('text')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .escape()
    .withMessage('Message text must not exceed 1000 characters'),
  
  body('image')
    .optional()
    .isBase64()
    .withMessage('Image must be a valid base64 string')
];

// Validation rules for profile updates
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
    .isBase64()
    .withMessage('Profile picture must be a valid base64 string')
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