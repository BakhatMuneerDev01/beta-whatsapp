// MODIFIED: New model for changelog entries
import mongoose, { Schema } from "mongoose";

const changelogSchema = new Schema({
    version: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['feature', 'improvement', 'bugfix', 'security', 'performance']
    },
    description: {
        type: String,
        required: true,
        maxlength: 500
    },
    breaking: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for efficient querying
changelogSchema.index({ version: 1, date: -1 });
changelogSchema.index({ type: 1, date: -1 });

const Changelog = mongoose.model("Changelog", changelogSchema);

export default Changelog;