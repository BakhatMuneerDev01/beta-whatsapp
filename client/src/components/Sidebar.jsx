import { useNavigate } from 'react-router-dom';
import assets from '../assets/assets';
import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { useQueryClient } from '@tanstack/react-query';

const Sidebar = ({ onShowChangelog }) => { // MODIFIED: Added changelog callback prop
    const { logout, onlineUsers } = useContext(AuthContext);
    const {
        users,
        selectedUser,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
        getUsers
    } = useContext(ChatContext);

    const [input, setInput] = useState('');
    const [debouncedInput, setDebouncedInput] = useState('');
    const queryClient = useQueryClient();

    const navigate = useNavigate();

    const debounce = useCallback((func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
    }, []);

    const debouncedSearch = useCallback(
        debounce((searchValue) => {
            setDebouncedInput(searchValue);
        }, 300),
        []
    );

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);
        debouncedSearch(value);
    };

    const filteredUsers = debouncedInput ? (users || []).filter((user) =>
        user.fullName.toLowerCase().includes(debouncedInput.toLowerCase())
    ) : (users || []);

    useEffect(() => {
        if (onlineUsers.length > 0) {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
    }, [onlineUsers, queryClient]);

    return (
        <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${selectedUser ? "max-md:hidden" : ""}`}>
            <div className='pb-5'>

                <div className='flex justify-between items-center'>
                    <img src={assets.logo} alt="Logo" className='max-w-40' />
                    <div className='relative py-2 group'>
                        <img src={assets.menu_icon} alt="logo" className='max-h-5 cursor-pointer' />
                        <div className='absolute top-full right-0 z-20 w-48 p-4 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'> {/* MODIFIED: Increased width */}
                            <p
                                onClick={() => navigate('/profile')}
                                className='cursor-pointer text-sm py-1 hover:text-white'>Edit Profile</p>
                            <hr className='my-2 border-t border-gray-500' />
                            {/* MODIFIED: Added changelog menu item */}
                            <p
                                onClick={onShowChangelog}
                                className='cursor-pointer text-sm py-1 hover:text-white flex items-center gap-2'>
                                <img src={assets.code} alt="Changelog" className='w-4 h-4' />
                                View Changelog
                            </p>
                            <hr className='my-2 border-t border-gray-500' />
                            <p
                                onClick={() => logout()}
                                className='cursor-pointer text-sm py-1 hover:text-white'>
                                Logout
                            </p>
                        </div>
                    </div>
                </div>

                <div className='bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5'>
                    <img src={assets.search_icon} alt="Search" className='w-3' />
                    <input type="text"
                        value={input} // MODIFIED: Bind to input state
                        onChange={handleInputChange} // MODIFIED: Use debounced handler
                        placeholder='Search user...'
                        className='bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1'
                    />
                </div>

                <div className='flex flex-col'>
                    {filteredUsers.map((user, index) => (
                        <div
                            key={index}
                            onClick={() => { setSelectedUser(user); setUnseenMessages(prev => ({ ...prev, [user._id]: 0 })) }}
                            className={`mt-2 relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${selectedUser?._id === user._id && 'bg-[#282142]/50'}`}>
                            <img src={user?.profilePic || assets.avatar_icon} alt="Profile" className='w-[35px] aspect-[1/1] rounded-full' />
                            <div className='flex flex-col leading-5'>
                                <p>{user.fullName}</p>
                                {
                                    onlineUsers.includes(user._id) ?
                                        <span className='text-green-400 text-xs'>Online</span>
                                        :
                                        <span className='text-neutral-400 text-xs'>Offline</span>
                                }
                            </div>
                            {unseenMessages[user._id] > 0 && <p className='absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50'>{unseenMessages[user._id]}</p>}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}

export default Sidebar;