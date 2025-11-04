import { useContext, useEffect, useRef, useState } from "react"
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

  const { authUser, onlineUsers } = useContext(AuthContext);

  const scrollEnd = useRef();
  const [input, setInput] = useState('');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return null;
    await sendMessage({ text: input.trim() });
    setInput(""); // Clear input after sending
  }

  // FIXED: Remove temporary "uploading" message display

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // FIXED: Show loading toast
    const loadingToast = toast.loading("Uploading image...");

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const success = await sendMessage({ image: reader.result });
        if (success) {
          toast.success("Image sent successfully", { id: loadingToast });
        } else {
          toast.error("Failed to send image", { id: loadingToast });
        }
      } catch (error) {
        toast.error("Failed to send image", { id: loadingToast });
      }
      e.target.value = "";
    };
    reader.onerror = () => {
      toast.error("Failed to read image file", { id: loadingToast });
    };
    reader.readAsDataURL(file);
  };

  // Add this function for send button click
  const handleSendButtonClick = () => {
    if (input.trim() === "") return;
    sendMessage({ text: input.trim() });
    setInput(""); // Clear input after sending
  }

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // Added messages dependency

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
        {messages.map((msg, index) => (
          <div key={msg._id || index} className={`flex items-end gap-2 justify-end ${msg.senderId !== authUser._id && 'flex-row-reverse'}`}>
            {msg.image ? (
              msg.image === 'uploading' ? (
                // Show uploading placeholder
                <div className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8 p-4 bg-gray-800/50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    <p className="text-white text-sm mt-2">Uploading...</p>
                  </div>
                </div>
              ) : (
                // Show actual image
                <img src={msg.image} alt="" className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8" />
              )
            ) : (
              <p className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${msg.senderId === authUser._id ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                {msg.text}
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