// NEW FILE: Added background job queue
import Bull from 'bull';
import cloudinary from './cloudinary.js';

const imageUploadQueue = new Bull('image upload',{
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
    }
});
// process image upload jobs
imageUploadQueue.process(async (job) => {
    try {
        const { image, type, messageId, userId } = job.data;
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: type === 'message' ? 'chat_messages' : 'profile_pictures'
        });
        return {
            success: true,
            imageUrl: uploadResponse.secure_url,
            messageId,
            userId
        }
    } catch (error) {
        throw new Error(`Image upload failed: ${error.message}`);
    }
})

export {imageUploadQueue}