import cloudinary from "../lib/cloudinary.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, userSocketMap } from "../server.js";


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

// send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const { text, image } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;
        let imageUrl;

        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image); // Added await
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        // Emit the new message to the receiver socket
        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.json({ success: true, newMessage }); // Fixed response
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
}