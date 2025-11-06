import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import toast from "react-hot-toast";
import io from 'socket.io-client';

// Enhanced environment variable handling with proper fallbacks
const backendUrl = import.meta.env.VITE_BACKEND_URL

console.log('Backend URL:', backendUrl); // Debug log

axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null); // MODIFIED: Ensure socket state is defined

    // check if user is authenticated. If yes, set the user data and connect to socket
    const checkAuth = async () => {
        try {
            if (!token) return;
            console.log('Checking auth with token:', token ? 'present' : 'missing');
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            } else {
                localStorage.removeItem("token");
                setToken(null);
                setAuthUser(null);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            console.error("Error details:", error.response?.data);
            localStorage.removeItem("token");
            setToken(null);
            setAuthUser(null);
        }
    };
    // login function to handle user authentication and socket connection
    const login = async (state, credentials) => {
        try {
            console.log('Attempting login to:', `${backendUrl}/api/auth/${state}`);
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                axios.defaults.headers.common["token"] = data.token;
                setToken(data.token);
                localStorage.setItem("token", data.token);
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Login error details:", {
                message: error.message,
                response: error.response?.data,
                config: error.config
            });
            toast.error(error.response?.data?.message || error.message || "Login failed");
        }
    };
    // Logout function to handle user logout and socket disconnection
    const logout = async () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        axios.defaults.headers.common["token"] = null;
        toast.success("Logged out successfully");
        if (socket && typeof socket.disconnect === 'function') {
            socket.disconnect();
            setSocket(null); // MODIFIED: Clear socket state on logout
        }
    }
    // Update profile function to handle user profile updates
    const updateProfile = async (body) => {
        try {
            console.log("Sending update request with:", {
                fullName: body.fullName,
                bio: body.bio,
                hasImage: !!body.profilePic
            });

            const { data } = await axios.put("/api/auth/update-profile", body);
            console.log("Update response:", data);

            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
                return true;
            } else {
                toast.error(data.message || "Profile update failed");
                return false;
            }
        } catch (error) {
            console.error("Profile update error:", error);
            console.error("Error response:", error.response?.data);
            toast.error(`Profile update failed: ${error.response?.data?.message || error.message}`);
            return false;
        }
    }
    // context/AuthContext.jsx - Improved socket connection
    const connectSocket = (userData) => {
        if (!userData) return;

        try {
            // Disconnect existing socket
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }

            console.log('Connecting socket to:', backendUrl);

            const newSocket = io(backendUrl, {
                query: {
                    userId: userData._id,
                },
                transports: ['polling'],
                upgrade: false,
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000
            });

            // FIXED: Added comprehensive error handling for socket events
            newSocket.on("connect", () => {
                console.log("✅ Socket connected successfully");
            });

            newSocket.on("connect_error", (error) => {
                console.error("❌ Socket connection error:", error.message);
            });

            newSocket.on("disconnect", (reason) => {
                console.log("🔌 Socket disconnected:", reason);
            });

            newSocket.on("error", (error) => {
                console.error("💥 Socket error:", error.message);
            });

            setSocket(newSocket);

            newSocket.on("getOnlineUsers", (userIds) => {
                try {
                    setOnlineUsers(userIds);
                } catch (error) {
                    console.error("Error handling online users:", error);
                }
            });

        } catch (error) {
            console.error("Socket setup failed:", error.message);
            // FIXED: Graceful degradation - app continues without socket
            setSocket(null);
        }
    };

    useEffect(() => {
        console.log("Current token:", token);
        console.log("Current authUser:", authUser);
        console.log("Current socket state:", socket ? "connected" : "disconnected");

        if (token) {
            axios.defaults.headers.common["token"] = token;
            axios.defaults.headers.common["Content-Type"] = "application/json";
            console.log("Axios headers set:", axios.defaults.headers.common["token"]);
            checkAuth();
        }
    }, [token])

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket, // MODIFIED: Ensure socket is included in context value
        login,
        logout,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
};