// ============================================
// File Upload Middleware — Cloudinary + Multer
// ============================================

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage for receipts
const receiptStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'grant-fund/receipts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Cloudinary storage for contract files
const contractStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'grant-fund/contracts',
    allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
    resource_type: 'auto'
  }
});

// Multer upload instances
const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadContract = multer({
  storage: contractStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = { uploadReceipt, uploadContract, cloudinary };
