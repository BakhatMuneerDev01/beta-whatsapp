import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios } = useContext(AuthContext);

    // function to get messages for selected user
    const getMessages = async (userId, cursor = null) => { // MODIFIED: Added cursor parameter
        try {
            const params = cursor ? `?cursor=${cursor}&limit=50` : '?limit=50'; // MODIFIED: Added pagination params
            const { data } = await axios.get(`/api/messages/${userId}${params}`);
            if (data.success) {
                // MODIFIED: Handle paginated response
                if (cursor) {
                    setMessages(prevMessages => [...prevMessages, ...data.messages]);
                } else {
                    setMessages(data.messages);
                }
                return data.pagination; // MODIFIED: Return pagination info
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // function to get all users for sidebar
    const getUsers = async (cursor = null) => { // MODIFIED: Added cursor parameter
        try {
            const params = cursor ? `?cursor=${cursor}&limit=50` : '?limit=50'; // MODIFIED: Added pagination params
            const { data } = await axios.get(`/api/messages/users${params}`);
            if (data.success) {
                // MODIFIED: Handle paginated response
                if (cursor) {
                    setUsers(prevUsers => [...prevUsers, ...data.users]);
                } else {
                    setUsers(data.users);
                }
                setUnseenMessages(data.unseenMessages);
                return data.pagination; // MODIFIED: Return pagination info
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    // function to send message to a selected user
    // MODIFIED: Improved error handling for message sending
    const sendMessage = async (messageData) => {
        try {
            // MODIFIED: Validate message data before sending
            if (!messageData.text && !messageData.image) {
                toast.error("Message cannot be empty");
                return false;
            }

            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
            if (data.success) {
                // Only add to local state if it's a text message
                // Image messages will be added via the background job completion
                if (!messageData.image) {
                    setMessages((prevMessages) => [...prevMessages, data.newMessage]);
                }
                return true;
            } else {
                toast.error(data.message || "Failed to send message");
                return false;
            }
        } catch (error) {
            console.error("Send message error:", error);
            // MODIFIED: Better error message handling
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error.response?.data?.errors) {
                // Handle validation errors
                const validationErrors = error.response.data.errors;
                toast.error(validationErrors[0]?.msg || "Validation failed");
            } else {
                toast.error("Failed to send message");
            }
            return false;
        }
    }

    // function to subscribe to message for selected user
    // MODIFIED: Added handler for updated messages
    const subscribeToMessages = () => {
        if (!socket) return;
        socket.on("newMessage", (newMessage) => {
            if (selectedUser && newMessage.senderId === selectedUser._id) {
                newMessage.seen = true;
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                axios.put(`/api/messages/mark/${newMessage._id}`);
            } else {
                setUnseenMessages((prevUnseenMessages) => ({
                    ...prevUnseenMessages,
                    [newMessage.senderId]: prevUnseenMessages[newMessage.senderId] ? prevUnseenMessages[newMessage.senderId] + 1 : 1
                }));
            }
        });

        // MODIFIED: Handle message updates (for images that finished uploading)
        socket.on("messageUpdated", (updatedMessage) => {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg._id === updatedMessage._id ? updatedMessage : msg
                )
            );
        });
    }

    // function to unSubscribe from messages
    const unsubscribeFromMessages = () => {
        if (socket) socket.off("newMessage");
    };

    useEffect(() => {
        subscribeToMessages();
        return () => unsubscribeFromMessages();
    }, [socket, selectedUser]);

    const value = {
        messages,
        users,
        selectedUser,
        getUsers,
        getMessages,
        sendMessage,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
};