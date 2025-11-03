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
    const sendMessage = async (messageData) => {
        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);
            if (data.success) {
                setMessages((prevMessages) => [...prevMessages, data.newMessage]); // Fixed: newMessages to newMessage
                return true;
            } else {
                toast.error(data.message);
                return false;
            }
        } catch (error) {
            toast.error(error.message);
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