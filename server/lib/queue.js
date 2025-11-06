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
        const { imageFile, type, senderId, receiverId, userId, messageId } = job.data;

        // MODIFIED: Enhanced file validation
        if (!imageFile || !imageFile.buffer) {
            throw new Error('Invalid image file data - no buffer found');
        }

        if (imageFile.buffer.length > 10 * 1024 * 1024) {
            throw new Error('Image file too large - maximum 10MB allowed');
        }

        const uploadOptions = {
            folder: type === 'message' ? 'chat_messages' : 'profile_pictures',
            resource_type: 'image',
            transformation: [
                { width: 1200, height: 1200, crop: 'limit' }, // MODIFIED: Increased size limit
                { quality: 'auto:good' }, // MODIFIED: Better quality setting
                { format: 'webp' }
            ]
        };

        // MODIFIED: Enhanced Cloudinary upload with longer timeout and progress tracking
        const uploadResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(new Error(`Cloudinary upload failed: ${error.message}`));
                    } else {
                        console.log('Cloudinary upload successful:', result.secure_url);
                        resolve(result);
                    }
                }
            );

            // MODIFIED: Increased timeout to 45 seconds for large uploads
            const timeout = setTimeout(() => {
                uploadStream.destroy(new Error('Cloudinary upload timeout (45s)'));
                reject(new Error('Image upload took too long - please try a smaller file'));
            }, 45000);

            uploadStream.on('finish', () => {
                clearTimeout(timeout);
                console.log('Upload stream finished');
            });

            uploadStream.on('error', (error) => {
                clearTimeout(timeout);
                console.error('Upload stream error:', error);
                reject(error);
            });

            console.log('Starting upload stream with buffer size:', imageFile.buffer.length);
            uploadStream.end(imageFile.buffer);
        });

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
        throw error;
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