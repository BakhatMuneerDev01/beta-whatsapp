// MODIFIED: New routes for changelog
import express from 'express';
import { getChangelog, addChangelogEntry } from '../controllers/changelogController.js';
import { protectRoute } from '../middleware/auth.js';

const changelogRouter = express.Router();

changelogRouter.get("/", getChangelog);
changelogRouter.post("/", protectRoute, addChangelogEntry); // Only authenticated users can add entries

export default changelogRouter;