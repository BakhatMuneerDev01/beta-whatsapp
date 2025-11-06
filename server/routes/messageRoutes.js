import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import { getMessages, getUsersForSidebar, sendMessage, markMessageAsSeen } from '../controllers/messageController.js';
import multer from 'multer';

// MODIFIED: Enhanced multer configuration with better error handling
// MODIFIED: Enhanced multer configuration with better error handling and larger file size
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // MODIFIED: Increased to 10MB limit for better user experience
    },
    fileFilter: (req, file, cb) => {
        // MODIFIED: More specific image type validation
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
        }
    }
});

// MODIFIED: Enhanced error handling wrapper for multer
const handleMulterError = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        success: false,
                        message: 'File too large. Maximum size is 10MB.'
                    });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        success: false,
                        message: 'Unexpected file field. Please use "image" as the field name.'
                    });
                }
            }
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};
const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);
// MODIFIED: Use enhanced multer error handling
messageRouter.post("/send/:id", protectRoute, handleMulterError, sendMessage);

export default messageRouter;