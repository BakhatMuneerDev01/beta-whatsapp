import { useContext, useEffect, useRef, useState, useCallback, useMemo } from "react"
import assets, { messagesDummyData } from "../assets/assets"
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../context/ChatContext";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    setSelectedUser,
    sendMessage,
    getMessages
  } = useContext(ChatContext);

  const { authUser, onlineUsers, axios } = useContext(AuthContext);

  const scrollEnd = useRef();
  const [input, setInput] = useState('');
  // MODIFIED: Add local state for optimistic messages since it's not in ChatContext
  const [optimisticMessages, setOptimisticMessages] = useState({});

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return null;
    await sendMessage({ text: input.trim() });
    setInput(""); // Clear input after sending
  }

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("select an image file")
      return;
    }

    // MODIFIED: Use object URL for immediate preview instead of base64
    const objectUrl = URL.createObjectURL(file);

    // Send optimistic message with object URL for immediate UI feedback
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      image: objectUrl,
      seen: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setOptimisticMessages(prev => ({
      ...prev,
      [tempId]: optimisticMessage
    }));

    try {
      // MODIFIED: Create FormData and send file directly with proper error handling
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // MODIFIED: Increased timeout to 60 seconds for large images
      });

      if (data.success) {
        // Clean up object URL after successful upload
        URL.revokeObjectURL(objectUrl);
        setOptimisticMessages(prev => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      // Clean up object URL on error
      URL.revokeObjectURL(objectUrl);
      setOptimisticMessages(prev => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });

      // MODIFIED: Better error messaging with specific guidance
      if (error.code === 'ECONNABORTED') {
        toast.error("Upload taking too long - try a smaller image or better connection");
      } else if (error.response?.status === 413) {
        toast.error("Image too large - please select a file under 5MB");
      } else if (error.response?.data?.message) {
        toast.error(`Upload failed: ${error.response.data.message}`);
      } else if (!navigator.onLine) {
        toast.error("No internet connection - please check your network");
      } else {
        toast.error("Failed to send image - server may be unavailable");
      }
    }

    e.target.value = "";
  }

  // Add this function for send button click
  const handleSendButtonClick = () => {
    if (input.trim() === "") return;
    sendMessage({ text: input.trim() });
    setInput(""); // Clear input after sending
  }

  // MODIFIED: Memoized scroll function to prevent recreation on every render
  const scrollToBottom = useCallback(() => {
    if (scrollEnd.current) {
      scrollEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]); // MODIFIED: Optimized dependency array

  // MODIFIED: Combine real messages with optimistic messages for display
  const allMessages = useMemo(() => {
    const optimisticList = Object.values(optimisticMessages);
    return [...messages, ...optimisticList].sort((a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [messages, optimisticMessages]);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop-blur-lg">
      {/* ----------Header--------- */}
      <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500 '>
        <img src={selectedUser.profilePic || assets.avatar_icon} alt="Profile" className="w-8 h-8 rounded-full" />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.arrow_icon} alt="" className="md:hidden max-w-7 cursor-pointer"
        />
        <img
          onClick={() => setSelectedUser(null)}
          src={assets.help_icon} alt="" className="max-md:hidden max-w-5 cursor-pointer"
        />
      </div>

      {/* ----------Chat area--------- */}
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
        {/* MODIFIED: Use allMessages (combined real + optimistic) instead of just messages */}
        {allMessages.map((msg, index) => (
          <div key={msg._id || index} className={`flex items-end gap-2 justify-end ${msg.senderId !== authUser._id && 'flex-row-reverse'}`}>
            {msg.image ? (
              msg.image === 'uploading' || msg.isOptimistic ? (
                // Show uploading/optimistic state
                <div className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8 p-4 bg-gray-800/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-white text-sm mt-2">
                      {msg.isOptimistic ? 'Sending...' : 'Uploading...'}
                    </p>
                  </div>
                </div>
              ) : (
                // Show actual image
                <img src={msg.image} alt="" className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8" />
              )
            ) : (
              <p className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all 
                ${msg.isOptimistic ? 'bg-gray-500/30' : 'bg-violet-500/30'} 
                ${msg.senderId === authUser._id ? 'rounded-br-none' : 'rounded-bl-none'} 
                text-white`}>
                {msg.text}
                {msg.isOptimistic && (
                  <span className="block text-xs text-gray-400 mt-1">Sending...</span>
                )}
              </p>
            )}
            <div className="text-center text-xs">
              <img src={msg.senderId === authUser._id ? authUser.profilePic || assets.avatar_icon : selectedUser?.profilePic || assets.avatar_icon} alt="" className="w-7 h-7 rounded-full" />
              <p className="text-gray-500">{formatMessageTime(msg.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={scrollEnd}></div>
      </div>

      {/* ----------bottom area--------- */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3">
        <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full">
          <input
            type="text"
            placeholder="Send a message"
            value={input} // Add value attribute
            onChange={(e) => setInput(e.target.value)} // Fixed onChange
            onKeyDown={(e) => e.key === "Enter" ? handleSendMessage(e) : null}
            className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400 bg-transparent"
          />
          <input onChange={handleSendImage} type="file" id="image" accept="image/png, image/jpeg" hidden />
          <label htmlFor="image">
            <img src={assets.gallery_icon} alt="Upload files" className="w-5 mr-2 cursor-pointer" />
          </label>
        </div>
        <img
          src={assets.send_button}
          alt="Send message"
          className="w-7 cursor-pointer"
          onClick={handleSendButtonClick} // Added onClick handler
        />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} className="max-w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  )
}

export default ChatContainer;