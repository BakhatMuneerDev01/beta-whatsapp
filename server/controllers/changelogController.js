// MODIFIED: New controller for changelog management
import Changelog from '../models/Changelog.js';

export const getChangelog = async (req, res) => {
    try {
        const changelog = await Changelog.find()
            .sort({ date: -1, version: -1 })
            .limit(50); // Get last 50 entries

        res.json({
            success: true,
            changelog
        });
    } catch (error) {
        console.log('Error fetching changelog:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch changelog'
        });
    }
};

export const addChangelogEntry = async (req, res) => {
    try {
        const { version, type, description, breaking = false } = req.body;

        // Validate required fields
        if (!version || !type || !description) {
            return res.status(400).json({
                success: false,
                message: 'Version, type, and description are required'
            });
        }

        // Validate type
        const validTypes = ['feature', 'improvement', 'bugfix', 'security', 'performance'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Type must be one of: ${validTypes.join(', ')}`
            });
        }

        const newEntry = await Changelog.create({
            version,
            type,
            description,
            breaking,
            date: new Date()
        });

        res.status(201).json({
            success: true,
            entry: newEntry
        });
    } catch (error) {
        console.log('Error adding changelog entry:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add changelog entry'
        });
    }
};