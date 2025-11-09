// server/scripts/populateChangelog.js
import mongoose from 'mongoose';
import Changelog from '../models/Changelog.js';
import initialData from '../data/lib/initialChangelog.js';

const populateChangelog = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Clear existing data
        await Changelog.deleteMany({});

        // Insert initial data
        await Changelog.insertMany(initialData);

        console.log('✅ Changelog populated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error populating changelog:', error);
        process.exit(1);
    }
};

populateChangelog();