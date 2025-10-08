const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'deal-' + uniqueSuffix + fileExtension);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['text/csv', 'application/pdf'];
  const allowedExtensions = ['.csv', '.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidType = allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension);
  if (isValidType) cb(null, true); else cb(new Error('Only CSV and PDF files are allowed'), false);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 20 } });
