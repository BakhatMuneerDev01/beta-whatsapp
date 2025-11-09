import { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import toast from 'react-hot-toast';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [optimisticMessages, setOptimisticMessages] = useState({});
    const [unseenMessages, setUnseenMessages] = useState({});
    const [users, setUsers] = useState([]);

    const { authUser, axios, socket } = useContext(AuthContext);

    // Function to get messages for a selected user
    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Function to get users for sidebar
    const getUsers = async () => {
        try {
            const { data } = await axios.get('/api/messages/users');
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages || {});
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // FIX: Add useEffect to automatically fetch users when authUser is available
    useEffect(() => {
        if (authUser) {
            getUsers();
        }
    }, [authUser]);

    // FIXED: Enhanced sendMessage with proper optimistic update handling
    const sendMessage = async (messageData) => {
        if (!selectedUser || !authUser) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            senderId: authUser._id,
            receiverId: selectedUser._id,
            ...messageData,
            seen: false,
            createdAt: new Date().toISOString(),
            isOptimistic: true
        };

        // Immediately add to UI
        setOptimisticMessages(prev => ({
            ...prev,
            [tempId]: optimisticMessage
        }));

        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData);

            if (data.success) {
                // Remove optimistic message - the real one will come via socket or we'll add it directly
                setOptimisticMessages(prev => {
                    const newState = { ...prev };
                    delete newState[tempId];
                    return newState;
                });

                // FIXED: Add the real message to messages state immediately
                // This prevents the message from disappearing while waiting for socket events
                setMessages(prev => [...prev, data.newMessage]);
            }
        } catch (error) {
            // Rollback on error
            setOptimisticMessages(prev => {
                const newState = { ...prev };
                delete newState[tempId];
                return newState;
            });
            toast.error("Failed to send message");
        }
    };

    // FIXED: Add socket event listeners for real-time message updates
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (newMessage) => {
            console.log('New message received via socket:', newMessage);
            setMessages(prev => {
                // Check if message already exists to avoid duplicates
                const exists = prev.find(msg => msg._id === newMessage._id);
                if (!exists) {
                    return [...prev, newMessage];
                }
                return prev;
            });
        };

        const handleMessageUpdated = (updatedMessage) => {
            console.log('Message updated via socket:', updatedMessage);
            setMessages(prev =>
                prev.map(msg =>
                    msg._id === updatedMessage._id ? updatedMessage : msg
                )
            );
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("messageUpdated", handleMessageUpdated);

        return () => {
            socket.off("newMessage", handleNewMessage);
            socket.off("messageUpdated", handleMessageUpdated);
        };
    }, [socket]);

    // Combine real and optimistic messages
    const allMessages = useMemo(() => {
        const optimisticList = Object.values(optimisticMessages);
        return [...messages, ...optimisticList].sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );
    }, [messages, optimisticMessages]);

    const value = {
        messages: allMessages,
        selectedUser,
        setSelectedUser,
        sendMessage,
        getMessages,
        getUsers,
        users,
        unseenMessages,
        setUnseenMessages
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};