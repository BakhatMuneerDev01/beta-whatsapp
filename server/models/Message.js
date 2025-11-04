import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String },
    image: { type: String },
    seen: { type: Boolean, default: false },
}, { timestamps: true });

// MODIFIED: Added validation to ensure message has either text or image
messageSchema.pre('save', function (next) {
    if (!this.text && !this.image) {
        return next(new Error('Message must have either text or image'));
    }
    next();
});

// MODIFIED: Added compound index for better pagination performance
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;