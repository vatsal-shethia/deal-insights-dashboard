const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'deal-' + uniqueSuffix + fileExtension);
  }
});

// File filter for CSV and PDF only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['text/csv', 'application/pdf'];
  const allowedExtensions = ['.csv', '.pdf'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidType = allowedTypes.includes(file.mimetype) || 
                     allowedExtensions.includes(fileExtension);
  
  if (isValidType) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 20 // max 20 files per upload
  }
});

// Upload endpoint
app.post('/api/deals/upload', upload.array('files'), (req, res) => {
  try {
    const uploaded = req.files;
    if (!uploaded || uploaded.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Uploaded ${uploaded.length} file(s)`);
    const filesInfo = uploaded.map(f => ({
      filename: f.filename,
      originalname: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
      path: f.path
    }));

    filesInfo.forEach(info => console.log('File uploaded:', info));

    // Here you would typically process the files further
    // For now, we'll just return a success response with a mock dealId
    const dealId = 'deal-' + Date.now();

    res.status(200).json({
      message: 'Files uploaded successfully',
      dealId: dealId,
      files: filesInfo
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }
  }
  res.status(400).json({ error: error.message });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Get list of uploaded files (optional - for debugging)
app.get('/api/uploads', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const fileDetails = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        uploaded: stats.birthtime
      };
    });
    res.json(fileDetails);
  } catch (error) {
    res.status(500).json({ error: 'Unable to read uploads directory' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});