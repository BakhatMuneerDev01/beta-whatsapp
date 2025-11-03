import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import { getMessages, getUsersForSidebar, sendMessage, markMessageAsSeen } from '../controllers/messageController.js';
import { validateMessage, handleValidationErrors } from '../middleware/validation.js'; // MODIFIED: Added validation imports

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen);
messageRouter.post("/send/:id", protectRoute, validateMessage, handleValidationErrors, sendMessage); // MODIFIED: Added validation middleware

export default messageRouter;