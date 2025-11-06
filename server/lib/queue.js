// server/lib/queue.js -----------------------------------------------------
import Bull from 'bull';
import cloudinary from './cloudinary.js';

const imageUploadQueue = new Bull('image upload', {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
    }
});

// MODIFIED: Improved job processing with better error handling
// lib/queue.js - Fix job data access
imageUploadQueue.process(async (job) => {
    try {
        console.log('Processing image upload job:', job.id);
        const { image, type, senderId, receiverId, userId, messageId } = job.data;

        if (!image || image === 'uploading') {
            throw new Error('Invalid image data');
        }

        // Remove data URL prefix if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        const uploadOptions = {
            folder: type === 'message' ? 'chat_messages' : 'profile_pictures',
            resource_type: 'image',
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto' },
                { format: 'webp' }
            ]
        };

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(
            `data:image/webp;base64,${base64Data}`,
            uploadOptions
        );

        console.log('Image uploaded successfully:', uploadResponse.secure_url);
        return {
            success: true,
            imageUrl: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
            messageId: messageId,
            userId: userId
        };
    } catch (error) {
        console.error('Image upload job failed:', error.message);
        throw error; // Re-throw to let Bull handle retries
    }
});
// MODIFIED: Add event listeners for job monitoring
imageUploadQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed successfully`);
});

imageUploadQueue.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed:`, error.message);
});

export { imageUploadQueue };