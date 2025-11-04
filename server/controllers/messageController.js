import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";
import { imageUploadQueue } from "../lib/queue.js";


// Get all message for a selected user
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;
        const { cursor, limit = 50 } = req.query; // MODIFIED: Added pagination parameters

        let query = {
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId }
            ]
        };

        // MODIFIED: Added cursor-based pagination
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        await Message.updateMany({ senderId: selectedUserId, receiverId: myId }, { seen: true });

        // MODIFIED: Return pagination metadata
        const nextCursor = messages.length > 0 ? messages[messages.length - 1].createdAt : null;
        const hasMore = messages.length === parseInt(limit);

        res.json({
            success: true,
            messages,
            pagination: {
                nextCursor,
                hasMore,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// Get all users except the logged in user
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const { cursor, limit = 50 } = req.query; // MODIFIED: Added pagination parameters

        let matchStage = { $match: { _id: { $ne: userId } } };

        // MODIFIED: Added cursor-based pagination for users
        if (cursor) {
            matchStage = {
                $match: {
                    _id: { $ne: userId, $lt: new mongoose.Types.ObjectId(cursor) }
                }
            };
        }

        const usersWithUnseenCounts = await User.aggregate([
            matchStage,
            {
                $lookup: {
                    from: "messages",
                    let: { targetUserId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$senderId", "$$targetUserId"] },
                                        { $eq: ["$receiverId", userId] },
                                        { $eq: ["$seen", false] }
                                    ]
                                }
                            }
                        },
                        { $count: "unseenCount" }
                    ],
                    as: "unseenMessages"
                }
            },
            {
                $project: {
                    _id: 1,
                    email: 1,
                    fullName: 1,
                    profilePic: 1,
                    bio: 1,
                    unseenCount: {
                        $ifNull: [{ $arrayElemAt: ["$unseenMessages.unseenCount", 0] }, 0]
                    }
                }
            },
            { $sort: { _id: -1 } }, // MODIFIED: Sort for consistent pagination
            { $limit: parseInt(limit) } // MODIFIED: Added limit
        ]);

        // MODIFIED: Calculate next cursor for users
        const nextCursor = usersWithUnseenCounts.length > 0 ?
            usersWithUnseenCounts[usersWithUnseenCounts.length - 1]._id : null;
        const hasMore = usersWithUnseenCounts.length === parseInt(limit);

        const filteredUsers = usersWithUnseenCounts.map(user => ({
            _id: user._id,
            email: user.email,
            fullName: user.fullName,
            profilePic: user.profilePic,
            bio: user.bio
        }));

        const unseenMessages = {};
        usersWithUnseenCounts.forEach(user => {
            if (user.unseenCount > 0) {
                unseenMessages[user._id.toString()] = user.unseenCount;
            }
        });

        res.json({
            success: true,
            users: filteredUsers,
            unseenMessages,
            pagination: {
                nextCursor,
                hasMore,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}

// api to mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { seen: true })
        res.json({ success: true })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        // MODIFIED: Better validation and error handling
        if (!text && !image) {
            return res.status(400).json({
                success: false,
                message: "Message must contain text or image"
            });
        }

        let imageUrl;

        if (image && image !== 'uploading') {
            // MODIFIED: Improved job creation with error handling
            const job = await imageUploadQueue.add('message-image-upload', {
                image,
                type: 'message',
                senderId: senderId.toString(),
                receiverId: receiverId.toString()
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            // Create message immediately with uploading state
            const newMessage = await Message.create({
                senderId,
                receiverId,
                text: text || '', // Ensure text is not undefined
                image: 'uploading'
            });

            // Process upload in background with better error handling
            job.finished().then(async (result) => {
                try {
                    if (result.success) {
                        await Message.findByIdAndUpdate(newMessage._id, {
                            image: result.imageUrl
                        });

                        // Notify clients of updated message
                        const updatedMessage = await Message.findById(newMessage._id);
                        const receiverSocketId = userSocketMap[receiverId];
                        if (receiverSocketId) {
                            io.to(receiverSocketId).emit("messageUpdated", updatedMessage);
                        }
                        // Also notify sender
                        const senderSocketId = userSocketMap[senderId];
                        if (senderSocketId) {
                            io.to(senderSocketId).emit("messageUpdated", updatedMessage);
                        }
                    } else {
                        console.error('Image upload failed:', result.error);
                        // Optionally update message to indicate failure
                        await Message.findByIdAndUpdate(newMessage._id, {
                            image: null,
                            text: text ? `${text} [Image upload failed]` : '[Image upload failed]'
                        });
                    }
                } catch (error) {
                    console.error('Error processing upload completion:', error);
                }
            }).catch(error => {
                console.error('Job failed:', error);
            });

            return res.json({ success: true, newMessage });
        } else {
            // Text-only message or image is already 'uploading' (shouldn't happen)
            const newMessage = await Message.create({
                senderId,
                receiverId,
                text: text || ''
            });

            const receiverSocketId = userSocketMap[receiverId];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }

            return res.json({ success: true, newMessage });
        }
    } catch (error) {
        console.log("Send message error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
}