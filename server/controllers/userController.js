import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from 'bcryptjs';
import { imageUploadQueue } from "../lib/queue.js";

// Signup new user
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
        // MODIFIED: Sanitize email input
        const sanitizedEmail = email.toLowerCase().trim();

        const userData = await User.findOne({ email: sanitizedEmail })
        if (!userData) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const token = generateToken(userData._id)
        res.json({ success: true, userData, token, message: "Login successful" })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

// Update user profile details
// FIXED: Direct synchronous profile picture upload
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;
        const userId = req.user._id;

        const sanitizedFullName = fullName ? fullName.trim().substring(0, 50) : undefined;
        const sanitizedBio = bio ? bio.trim().substring(0, 500) : undefined;

        let profilePicUrl = null;

        // FIXED: Upload profile picture synchronously
        if (profilePic && profilePic !== 'uploading') {
            try {
                const base64Data = profilePic.replace(/^data:image\/\w+;base64,/, '');

                const uploadResponse = await cloudinary.uploader.upload(
                    `data:image/webp;base64,${base64Data}`,
                    {
                        folder: 'profile_pictures',
                        resource_type: 'image',
                        transformation: [
                            { width: 400, height: 400, crop: 'fill' },
                            { quality: 'auto' },
                            { format: 'webp' }
                        ]
                    }
                );

                profilePicUrl = uploadResponse.secure_url;
                console.log('Profile picture uploaded:', profilePicUrl);
            } catch (uploadError) {
                console.error('Profile picture upload failed:', uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload profile picture"
                });
            }
        }

        // Update user with all fields
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                ...(profilePicUrl && { profilePic: profilePicUrl }),
                ...(sanitizedBio && { bio: sanitizedBio }),
                ...(sanitizedFullName && { fullName: sanitizedFullName })
            },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.log("Error updating profile:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};