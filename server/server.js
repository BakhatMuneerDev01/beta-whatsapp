import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import http from 'http';
import connectDB from './lib/db.js';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

const app = express();
const server = http.createServer(app);

// Initialize socket.io server
// Update Socket.io initialization for Vercel compatibility
export const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://beta-whatsapp-frontend.vercel.app",
            "http://localhost:5174"
        ],
        methods: ["GET", "POST", "PUT"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "token"]
    },
    transports: ['polling'], // FIXED: Use only polling for Vercel
    allowUpgrades: false, // FIXED: Prevent upgrade attempts to websocket
    pingTimeout: 60000,
    pingInterval: 25000
});

// Add connection state handling
io.engine.on("connection_error", (err) => {
    console.log("Socket.io connection error:", err);
});

// store online users
export const userSocketMap = {}; // {userId: socketId}

// socket.io connection handler
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log("User connected:", userId);
    if (userId) userSocketMap[userId] = socket.id;
    // Emit online users to all connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    socket.on("disconnect", () => {
        console.log("User disconnected", userId)
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap))
    })
})

// Enhanced CORS configuration
app.use(cors({
    origin: ["http://localhost:5173", "https://beta-whatsapp-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "token"]
}));

// Auth rate limiter - 10 requests per minute
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: {
        error: 'Too many authentication attempts, please try again after 1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Message rate limiter - 100 requests per minute  
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100, // Increased from 10 to 100 for better user experience
    message: {
        error: "Too many messages, please slow down"
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware setup
app.use(express.json({ limit: "10mb" })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Api's imports
import userRouter from './routes/userRoutes.js';
import messageRouter from './routes/messageRoutes.js';

// Api's setup
app.use("/api/auth", authLimiter, userRouter);
app.use("/api/messages", messageLimiter, messageRouter);

app.use("/api/status", (req, res) => res.send("Server is live"));

// connect to database
await connectDB();

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log("Server is running on PORT " + PORT));
}

// export server for vercel
export default app;