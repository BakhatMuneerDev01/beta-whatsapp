import express from 'express';
import multer from 'multer';
import { login, signup, updateProfile } from '../controllers/userController.js';
import { checkAuth, protectRoute } from '../middleware/auth.js';
import { validateSignup, validateLogin, validateProfile, handleValidationErrors } from '../middleware/validation.js'; // MODIFIED: Added validation imports


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

const userRouter = express.Router();

userRouter.post("/signup", validateSignup, handleValidationErrors, signup);
userRouter.post("/login", validateLogin, handleValidationErrors, login);
// MODIFIED: Add multer middleware for profile picture uploads
userRouter.put("/update-profile", protectRoute, upload.single('profilePic'), updateProfile);
userRouter.get("/check", protectRoute, checkAuth);

export default userRouter;