// backend/server.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const csv = require('csv-parser');
const pdfParse = require('pdf-parse');

// === GOOGLE GEMINI CLIENT (Google Gen AI SDK) ===
// Install with: npm install @google/genai
// The client will use process.env.GEMINI_API_KEY (you'll set this in .env)
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    fileSize: 10 * 1024 * 1024,
    files: 20
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

// NEW: Smart financial data extraction from CSV or text
const extractFinancialDataSmart = (content) => {
  // If content is an array (CSV data)
  if (Array.isArray(content)) {
    return extractFromCSV(content);
  }
  
  // If content is a string (PDF text)
  if (typeof content === 'string') {
    return extractFromText(content);
  }
  
  // Fallback
  return null;
};

// Extract from CSV data
const extractFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) return null;

  console.log('CSV Headers:', Object.keys(csvData[0]));
  console.log('CSV Sample Row:', csvData[0]);

  // Normalize headers (trim whitespace, lowercase)
  const normalizedData = csvData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = key.trim().toLowerCase();
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });

  // Calculate totals
  let totalRevenue = 0;
  let totalEbitda = 0;
  let totalDebt = 0;
  let totalCapex = 0;

  normalizedData.forEach(row => {
    // Try different possible column names
    const revenue = parseFloat(row.revenue || row.sales || row['total revenue'] || 0);
    const ebitda = parseFloat(row.ebitda || row.earnings || row['operating income'] || 0);
    const debt = parseFloat(row.debt || row.liabilities || row['total debt'] || 0);
    const capex = parseFloat(row.capex || row['capital expenditure'] || row['cap ex'] || 0);

    if (!isNaN(revenue)) totalRevenue += revenue;
    if (!isNaN(ebitda)) totalEbitda += ebitda;
    if (!isNaN(debt)) totalDebt += debt;
    if (!isNaN(capex)) totalCapex += capex;
  });

  // Calculate growth rate (simple estimate based on first vs last row)
  let revenueGrowth = 10; // default
  if (normalizedData.length >= 2) {
    const firstRevenue = parseFloat(normalizedData[0].revenue || normalizedData[0].sales || 0);
    const lastRevenue = parseFloat(normalizedData[normalizedData.length - 1].revenue || 
                                   normalizedData[normalizedData.length - 1].sales || 0);
    
    if (firstRevenue > 0 && lastRevenue > 0) {
      revenueGrowth = ((lastRevenue - firstRevenue) / firstRevenue * 100).toFixed(1);
    }
  }

  const result = {
    revenue: totalRevenue || null,
    ebitda: totalEbitda || null,
    debt: totalDebt || null,
    capex: totalCapex || null,
    revenueGrowth: parseFloat(revenueGrowth) || null,
    dataSource: 'csv',
    rowCount: csvData.length
  };

  console.log('Extracted from CSV:', result);
  return result;
};

// Extract from text (PDF content)
const extractFromText = (text) => {
  const lowerText = text.toLowerCase();
  
  const patterns = {
    revenue: [
      /(?:total\s+)?revenue[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
      /(?:total\s+)?sales[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
      /revenue[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)/i
    ],
    ebitda: [
      /ebitda[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
      /earnings[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
    ],
    debt: [
      /(?:total\s+)?debt[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
      /liabilities[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
    ],
    growth: [
      /(?:revenue\s+)?growth[:\s]+(\d+(?:[\.,]\d+)?)%?/i,
      /yoy[:\s]+(\d+(?:[\.,]\d+)?)%?/i,
      /year[- ]over[- ]year[:\s]+(\d+(?:[\.,]\d+)?)%?/i
    ]
  };

  const extract = (patternList) => {
    for (const pattern of patternList) {
      const match = lowerText.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = match[2]?.toLowerCase();
        // Convert billions to millions
        return unit && (unit.includes('b') || unit.includes('billion')) ? value * 1000 : value;
      }
    }
    return null;
  };

  const result = {
    revenue: extract(patterns.revenue),
    ebitda: extract(patterns.ebitda),
    debt: extract(patterns.debt),
    revenueGrowth: extract(patterns.growth),
    dataSource: 'text'
  };

  console.log('Extracted from text:', result);
  return result;
};

// Mock AI analysis fallback
const mockAIAnalysis = (financialData, fileName) => {
  const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
  
  const revenue = financialData.revenue || 100;
  const ebitda = financialData.ebitda || 20;
  const debt = financialData.debt || 30;
  const growth = financialData.revenueGrowth || 10;
  
  return {
    summary: `${companyName} shows financial performance with ${growth}% YoY growth. EBITDA margin of ${(ebitda / revenue * 100).toFixed(1)}%. Total revenue of $${revenue}M across segments with debt levels at $${debt}M.` ,
    risks: [
      `Leverage ratio of ${(debt / revenue).toFixed(2)} may limit financial flexibility`,
      'Market competition and pricing pressure in key segments',
      'Dependency on economic conditions and commodity prices'
    ],
    opportunities: [
      `Growth potential indicated by ${growth}% YoY trajectory`,
      'Operational efficiency improvements possible',
      'Market expansion and diversification opportunities'
    ],
    metrics: {
      revenue: revenue,
      revenueGrowth: growth,
      ebitda: ebitda,
      debt: debt,
      cashFlow: Math.round(ebitda * 0.65 * 100) / 100,
      valuation: Math.round(revenue * 1.2),
      debtRatio: (debt / revenue).toFixed(2),
      profitMargin: ((ebitda / revenue) * 100).toFixed(1)
    }
  };
};

// ---- Replace OpenAI call with Gemini (Google Gen AI) ----
const analyzeDealWithAI = async (fileContent, financialData, fileName) => {
  try {
    const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
    
    // Prepare content snippet
    const contentSnippet = typeof fileContent === 'string' 
      ? fileContent.substring(0, 2000) 
      : JSON.stringify(fileContent).substring(0, 2000);

    const prompt = `You are a private equity analyst. Analyze this financial deal document and provide insights.

Company: ${companyName}
Financial Metrics:
- Revenue: $${financialData.revenue}M
- EBITDA: $${financialData.ebitda}M
- Debt: $${financialData.debt}M
- Revenue Growth: ${financialData.revenueGrowth}%

Document Excerpt:
${contentSnippet}

Please provide a JSON response with:
{
  "summary": "A 2-3 sentence executive summary highlighting key financial performance, growth trajectory, and market position",
  "risks": ["Risk 1 (specific financial or operational concern)", "Risk 2", "Risk 3"],
  "opportunities": ["Opportunity 1 (specific growth or efficiency potential)", "Opportunity 2", "Opportunity 3"]
}

Be specific and professional. Reference actual metrics where possible.`;

    console.log('Calling Gemini API...');

    // Use Gemini (Google Gen AI SDK)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // pick a Gemini model available to your key
      contents: [
        {
          role: "user",
          parts: [
            { text: "You are a senior financial analyst specializing in private equity deal analysis. Provide concise, data-driven insights." }
          ]
        },
        {
          role: "user",
          parts: [
            { text: prompt }
          ]
        }
      ],
      config: {
        candidateCount: 1
      }
    });

    // The SDK typically exposes `response.text` (or candidates array). Be robust:
    const rawText = response?.text 
      || response?.candidates?.[0]?.content?.parts?.[0]?.text 
      || JSON.stringify(response);

    console.log('Gemini raw response:', rawText);

    // Try to parse JSON directly; fallback to extracting JSON substring
    let analysis = null;
    try {
      analysis = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          analysis = null;
        }
      }
    }

    if (!analysis) {
      // If parsing fails, fallback to mock analysis (keeps behavior identical)
      throw new Error('Failed to parse Gemini response as JSON');
    }

    return {
      summary: analysis.summary || mockAIAnalysis(financialData, fileName).summary,
      risks: analysis.risks || mockAIAnalysis(financialData, fileName).risks,
      opportunities: analysis.opportunities || mockAIAnalysis(financialData, fileName).opportunities,
      metrics: {
        revenue: financialData.revenue,
        revenueGrowth: financialData.revenueGrowth,
        ebitda: financialData.ebitda,
        debt: financialData.debt,
        cashFlow: Math.round(financialData.ebitda * 0.65 * 10) / 10,
        valuation: Math.round(financialData.revenue * 1.2),
        debtRatio: (financialData.debt / financialData.revenue).toFixed(2),
        profitMargin: ((financialData.ebitda / financialData.revenue) * 100).toFixed(1)
      }
    };
    
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    console.log('Falling back to mock analysis');
    return mockAIAnalysis(financialData, fileName);
  }
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
    let fileContent = null;
    let financialData = {};
    
    // Parse first file
    if (uploaded.length > 0) {
      const file = uploaded[0];
      
      try {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          const csvData = await parseCSV(file.path);
          fileContent = csvData;
          financialData = extractFinancialDataSmart(csvData);
        } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
          fileContent = await parsePDF(file.path);
          financialData = extractFinancialDataSmart(fileContent);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        return res.status(400).json({ 
          error: 'Failed to parse file. Please ensure it contains valid financial data.',
          details: parseError.message 
        });
      }
    }
    
    // Validate extracted data
    if (!financialData || !financialData.revenue) {
      return res.status(400).json({ 
        error: 'Could not extract financial metrics from the file. Please ensure your CSV has columns like: Segment, Revenue, EBITDA, Debt, or your PDF contains clear financial data.' 
      });
    }
    
    // Get AI analysis
    console.log('Starting AI analysis...');
    const aiAnalysis = await analyzeDealWithAI(fileContent, financialData, uploaded[0].originalname);
    console.log('AI analysis complete');
    
    // Create quarterly breakdown (distribute totals across quarters)
    const quarterlyBreakdown = [0.22, 0.24, 0.26, 0.28];
    
    // Create complete deal data
    const dealData = {
      id: dealId,
      companyName: aiAnalysis.summary.split(' ')[0] + ' Corp.',
      dealName: 'Financial Analysis Report',
      dateUploaded: new Date().toISOString(),
      industry: 'Multi-Sector',
      files: uploaded.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        size: f.size,
        mimetype: f.mimetype
      })),
      ...aiAnalysis,
      revenueData: quarterlyBreakdown.map((pct, i) => ({
        period: `Q${i+1} 2024`,
        revenue: Math.round(financialData.revenue * pct)
      })),
      ebitdaData: quarterlyBreakdown.map((pct, i) => ({
        period: `Q${i+1} 2024`,
        ebitda: Math.round(financialData.ebitda * pct),
        margin: (financialData.ebitda / financialData.revenue * 100).toFixed(1)
      }))
    };
    
    // Store in memory
    dealsCache.set(dealId, dealData);
    
    // Add to deals list for history
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
      tags: ['Uploaded', 'AI Analyzed'],
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
    dealsCount: dealsCache.get('allDeals')?.length || 0,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Error handling middleware
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
  console.log(`Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
  console.log(`Deals in memory: ${dealsCache.size}`);
});
