const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const csv = require('csv-parser');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for deals
const dealsCache = new Map();

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

// File parsing functions
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  return pdfData.text;
};

// Extract financial data from parsed content
const extractFinancialData = (content) => {
  // Enhanced extraction logic
  const revenueMatch = content.match(/(revenue|sales).*?(\d+(?:\.\d+)?)\s*[mb]illion?/i);
  const ebitdaMatch = content.match(/(ebitda).*?(\d+(?:\.\d+)?)\s*[mb]illion?/i);
  const debtMatch = content.match(/(debt).*?(\d+(?:\.\d+)?)\s*[mb]illion?/i);
  const growthMatch = content.match(/(growth).*?(\d+(?:\.\d+)?)\s*%/i);
  
  return {
    revenue: revenueMatch ? parseFloat(revenueMatch[2]) * (content.toLowerCase().includes('million') ? 1 : 1000) : 125,
    ebitda: ebitdaMatch ? parseFloat(ebitdaMatch[2]) * (content.toLowerCase().includes('million') ? 1 : 1000) : 25,
    debt: debtMatch ? parseFloat(debtMatch[2]) * (content.toLowerCase().includes('million') ? 1 : 1000) : 40,
    revenueGrowth: growthMatch ? parseFloat(growthMatch[2]) : 15,
  };
};

// Mock AI analysis
const analyzeDealWithAI = async (fileContent, financialData, fileName) => {
  // Extract company name from filename
  const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
  
  return {
    summary: `${companyName} shows strong financial performance with ${financialData.revenueGrowth}% YoY growth, driven by expanding market operations. Healthy EBITDA margin of ${(financialData.ebitda / financialData.revenue * 100).toFixed(1)}%, though debt levels remain at industry average. The company demonstrates consistent revenue trajectory with improving operational efficiency metrics.`,
    risks: [
      `Moderate leverage ratio of ${(financialData.debt / financialData.revenue).toFixed(2)} compared to sector peers`,
      'Market competition intensifying in core segments',
      'Dependency on key supplier relationships'
    ],
    opportunities: [
      `Strong growth potential in emerging markets (+${financialData.revenueGrowth}% YoY)`,
      'Increasing recurring revenue stream visibility',
      'Recent strategic partnerships showing positive early results'
    ],
    metrics: {
      revenue: financialData.revenue,
      revenueGrowth: financialData.revenueGrowth,
      ebitda: financialData.ebitda,
      debt: financialData.debt,
      cashFlow: financialData.ebitda * 0.6, // Mock calculation
      valuation: Math.round(financialData.revenue * 1.2),
      debtRatio: (financialData.debt / financialData.revenue).toFixed(2),
      profitMargin: ((financialData.ebitda / financialData.revenue) * 100).toFixed(1)
    }
  };
};

// Upload endpoint with AI analysis
app.post('/api/deals/upload', upload.array('files'), async (req, res) => {
  try {
    const uploaded = req.files;
    if (!uploaded || uploaded.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Uploaded ${uploaded.length} file(s)`);
    
    const dealId = 'deal-' + Date.now();
    let fileContent = '';
    let financialData = {};
    
    // Parse first file
    if (uploaded.length > 0) {
      const file = uploaded[0];
      
      try {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          const csvData = await parseCSV(file.path);
          fileContent = JSON.stringify(csvData);
          financialData = extractFinancialData(fileContent);
        } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
          fileContent = await parsePDF(file.path);
          financialData = extractFinancialData(fileContent);
        }
      } catch (parseError) {
        console.log('Using default data due to parse error:', parseError.message);
        financialData = { revenue: 125, ebitda: 25, debt: 40, revenueGrowth: 15 };
      }
    }
    
    // Get AI analysis
    const aiAnalysis = await analyzeDealWithAI(fileContent, financialData, uploaded[0].originalname);
    
    // Create complete deal data
    const dealData = {
      id: dealId,
      companyName: aiAnalysis.summary.split(' ')[0] + ' ' + aiAnalysis.summary.split(' ')[1] + ' Inc.',
      dealName: 'Financial Analysis Report',
      dateUploaded: new Date().toISOString(),
      industry: 'Technology',
      files: uploaded.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype
      })),
      ...aiAnalysis,
      revenueData: [
        { period: "Q1 2024", revenue: financialData.revenue * 0.22 },
        { period: "Q2 2024", revenue: financialData.revenue * 0.24 },
        { period: "Q3 2024", revenue: financialData.revenue * 0.26 },
        { period: "Q4 2024", revenue: financialData.revenue * 0.28 }
      ],
      ebitdaData: [
        { period: "Q1 2024", ebitda: financialData.ebitda * 0.22, margin: (financialData.ebitda / financialData.revenue * 100).toFixed(1) },
        { period: "Q2 2024", ebitda: financialData.ebitda * 0.24, margin: (financialData.ebitda / financialData.revenue * 100).toFixed(1) },
        { period: "Q3 2024", ebitda: financialData.ebitda * 0.26, margin: (financialData.ebitda / financialData.revenue * 100).toFixed(1) },
        { period: "Q4 2024", ebitda: financialData.ebitda * 0.28, margin: (financialData.ebitda / financialData.revenue * 100).toFixed(1) }
      ]
    };
    
    // Store in memory
    dealsCache.set(dealId, dealData);
    
    // Also add to deals list for history
    const dealForHistory = {
      id: dealId,
      companyName: dealData.companyName,
      dealName: dealData.dealName,
      dateUploaded: dealData.dateUploaded.split('T')[0],
      revenue: financialData.revenue,
      ebitda: financialData.ebitda,
      debtRatio: dealData.metrics.debtRatio,
      industry: dealData.industry,
      summary: dealData.summary.substring(0, 150) + '...',
      tags: ['Uploaded', 'Analyzed'],
      fileName: uploaded[0].originalname
    };
    
    if (!dealsCache.has('allDeals')) {
      dealsCache.set('allDeals', []);
    }
    dealsCache.get('allDeals').push(dealForHistory);

    res.status(200).json({
      message: 'Files uploaded and analyzed successfully',
      dealId: dealId,
      deal: dealData
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// Get specific deal
app.get('/api/deals/:dealId', (req, res) => {
  const deal = dealsCache.get(req.params.dealId);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json(deal);
});

// Get all deals for history
app.get('/api/deals', (req, res) => {
  const deals = dealsCache.get('allDeals') || [];
  res.json(deals);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    dealsCount: dealsCache.get('allDeals')?.length || 0
  });
});

// Get uploaded files list
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

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
    }
  }
  res.status(400).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
  console.log(`Deals in memory: ${dealsCache.size}`);
});

// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const cors = require('cors');

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Ensure uploads directory exists
// const uploadsDir = path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadsDir)) {
//   fs.mkdirSync(uploadsDir, { recursive: true });
// }

// // Configure multer for file storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadsDir);
//   },
//   filename: (req, file, cb) => {
//     // Generate unique filename with timestamp and original extension
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     const fileExtension = path.extname(file.originalname);
//     cb(null, 'deal-' + uniqueSuffix + fileExtension);
//   }
// });

// // File filter for CSV and PDF only
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = ['text/csv', 'application/pdf'];
//   const allowedExtensions = ['.csv', '.pdf'];
  
//   const fileExtension = path.extname(file.originalname).toLowerCase();
//   const isValidType = allowedTypes.includes(file.mimetype) || 
//                      allowedExtensions.includes(fileExtension);
  
//   if (isValidType) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only CSV and PDF files are allowed'), false);
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit per file
//     files: 20 // max 20 files per upload
//   }
// });

// // Upload endpoint
// app.post('/api/deals/upload', upload.array('files'), (req, res) => {
//   try {
//     const uploaded = req.files;
//     if (!uploaded || uploaded.length === 0) {
//       return res.status(400).json({ error: 'No files uploaded' });
//     }

//     console.log(`Uploaded ${uploaded.length} file(s)`);
//     const filesInfo = uploaded.map(f => ({
//       filename: f.filename,
//       originalname: f.originalname,
//       size: f.size,
//       mimetype: f.mimetype,
//       path: f.path
//     }));

//     filesInfo.forEach(info => console.log('File uploaded:', info));

//     // Here you would typically process the files further
//     // For now, we'll just return a success response with a mock dealId
//     const dealId = 'deal-' + Date.now();

//     res.status(200).json({
//       message: 'Files uploaded successfully',
//       dealId: dealId,
//       files: filesInfo
//     });

//   } catch (error) {
//     console.error('Upload error:', error);
//     res.status(500).json({ error: 'Upload failed: ' + error.message });
//   }
// });

// // Error handling middleware for multer
// app.use((error, req, res, next) => {
//   if (error instanceof multer.MulterError) {
//     if (error.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
//     }
//   }
//   res.status(400).json({ error: error.message });
// });

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.status(200).json({ status: 'OK', message: 'Server is running' });
// });

// // Get list of uploaded files (optional - for debugging)
// app.get('/api/uploads', (req, res) => {
//   try {
//     const files = fs.readdirSync(uploadsDir);
//     const fileDetails = files.map(filename => {
//       const filePath = path.join(uploadsDir, filename);
//       const stats = fs.statSync(filePath);
//       return {
//         filename,
//         size: stats.size,
//         uploaded: stats.birthtime
//       };
//     });
//     res.json(fileDetails);
//   } catch (error) {
//     res.status(500).json({ error: 'Unable to read uploads directory' });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
//   console.log(`Uploads directory: ${uploadsDir}`);
// });