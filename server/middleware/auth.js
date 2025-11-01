import User from "../models/User.js";
import jwt from 'jsonwebtoken';


// Middleware to protect routes
export const protectRoute = async (req, res, next) => {
    try {
        // Fix: Get token from correct header (usually Authorization, but your frontend uses "token")
        const token = req.headers.token || req.header('token'); // Fixed header access
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) return res.status(404).json({
            success: false,
            message: "User not found"
        });
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid token"
        });
    }
}

// controller to check if user is authenticated
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
};