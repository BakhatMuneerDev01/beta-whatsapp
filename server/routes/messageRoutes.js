import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import { getMessages, getUsersForSidebar, sendMessage, markMessageAsSeen } from '../controllers/messageController.js'; // Import markMessageAsSeen

const messageRouter = express.Router();

messageRouter.get("/users", protectRoute, getUsersForSidebar);
messageRouter.get("/:id", protectRoute, getMessages);
messageRouter.put("/mark/:id", protectRoute, markMessageAsSeen); // Fixed: use markMessageAsSeen
messageRouter.post("/send/:id", protectRoute, sendMessage);

export default messageRouter;