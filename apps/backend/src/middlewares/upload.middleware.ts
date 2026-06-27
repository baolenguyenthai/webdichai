import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ai-video-translator/projects',
    resource_type: 'auto', // Tự động nhận diện video/audio
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav'],
  } as any,
});

export const upload = multer({ storage });
