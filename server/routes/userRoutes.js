import express from 'express';
import { login, signup, updateProfile } from '../controllers/userController.js';
import { checkAuth, protectRoute } from '../middleware/auth.js';
import { validateAuth, validateProfile, handleValidationErrors } from '../middleware/validation.js'; // MODIFIED: Added validation imports

const userRouter = express.Router();

userRouter.post("/signup", validateAuth, handleValidationErrors, signup); // MODIFIED: Added validation middleware
userRouter.post("/login", [body('email').isEmail().normalizeEmail(), body('password').notEmpty()], handleValidationErrors, login); // MODIFIED: Added validation middleware
userRouter.put("/update-profile", protectRoute, validateProfile, handleValidationErrors, updateProfile); // MODIFIED: Added validation middleware
userRouter.post("/check", protectRoute, checkAuth);

export default userRouter;