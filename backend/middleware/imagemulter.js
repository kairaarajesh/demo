
import { v2 as cloudinary } from 'cloudinary';

import multer from 'multer';
import path from 'path';
import dotenv from 'dotenv';  

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const storage = multer.diskStorage({
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
    
    const allowedTypes = /jpeg|png|gif|webp|jpg/;

    const ext = path .extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'));
    }

};

const uploadImage = async (filePath) => {
    try {
        const result = await cloudinary.uploader
        .upload(filePath.path, {
            folder: "saloon-crm",
            resource_type: "image",
        });
        return result;

    } catch (error) {
        console.error(' Cloudinary Image Upload Error:', error);
         throw error;
    }
};

const imageMulter = multer({ storage, fileFilter,
    limits: {fileSize: 10 * 1024 * 1024 },
});

export { imageMulter, uploadImage };