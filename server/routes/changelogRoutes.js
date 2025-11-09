// MODIFIED: New routes for changelog
import express from 'express';
import { getChangelog, addChangelogEntry } from '../controllers/changelogController.js';
import { protectRoute } from '../middleware/auth.js';

const changelogRouter = express.Router();

changelogRouter.get("/", getChangelog);
changelogRouter.post("/", protectRoute, addChangelogEntry); // Only authenticated users can add entries
// Add this route to your changelogRoutes.js for easy updates
changelogRouter.post("/add-entry", protectRoute, async (req, res) => {
    try {
        const { version, type, description, breaking = false } = req.body;

        const newEntry = await Changelog.create({
            version,
            type,
            description,
            breaking,
            date: new Date()
        });

        res.json({ success: true, entry: newEntry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default changelogRouter;