import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from 'bcryptjs';

// Signup new user
// MODIFIED: Added input sanitization at controller level
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body;
    try {
        // MODIFIED: Additional server-side validation
        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // MODIFIED: Sanitize inputs
        const sanitizedFullName = fullName.trim().substring(0, 50);
        const sanitizedBio = bio.trim().substring(0, 500);
        const sanitizedEmail = email.toLowerCase().trim();

        const user = await User.findOne({ email: sanitizedEmail })
        if (user) {
            return res.status(409).json({ success: false, message: "Account already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName: sanitizedFullName,
            email: sanitizedEmail,
            password: hashedPassword,
            bio: sanitizedBio
        });

        const token = generateToken(newUser._id);
        res.status(201).json({ success: true, userData: newUser, token, message: "Account created successfully" });
    } catch (error) {
        console.log("Error during user registration:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

// Login a user
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userData = await User.findOne({ email })
        if (!userData) {
            return res.json({ success: false, message: "User not found" })
        }
        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.json({ success: false, message: "Invalid credentials" })
        }
        const token = generateToken(userData._id)
        res.json({ success: true, userData, token, message: "Login successful" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Update user profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;
        const userId = req.user._id;
        let updatedUser;
        if (!profilePic) {
            updatedUser = await User.findByIdAndUpdate(userId, { bio, fullName }, { new: true })
        } else {
            const upload = await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(userId, { profilePic: upload.secure_url, bio, fullName }, { new: true })
        }
        res.json({ success: true, user: updatedUser })
    } catch (error) {
        console.log("Error updating profile:", error.message)
        res.json({ success: false, message: error.message })
    }
}