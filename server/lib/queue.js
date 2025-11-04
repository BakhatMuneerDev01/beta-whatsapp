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
imageUploadQueue.process(async (job) => {
    try {
        console.log('Processing image upload job:', job.id);
        const { image, type, senderId, receiverId, userId } = job.data;

        if (!image) {
            throw new Error('No image data provided');
        }

        // MODIFIED: Add folder and transformation options
        const uploadOptions = {
            folder: type === 'message' ? 'chat_messages' : 'profile_pictures',
            transformation: [
                { width: 800, height: 800, crop: 'limit' }, // Resize large images
                { quality: 'auto' },
                { format: 'webp' } // Convert to webp for better performance
            ]
        };

        const uploadResponse = await cloudinary.uploader.upload(image, uploadOptions);

        console.log('Image uploaded successfully:', uploadResponse.secure_url);
        return {
            success: true,
            imageUrl: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
            messageId: job.data.messageId,
            userId
        };
    } catch (error) {
        console.error('Image upload job failed:', error.message);
        throw new Error(`Image upload failed: ${error.message}`);
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