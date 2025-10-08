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
// Sector Benchmarks
const sectorBenchmarks = {
  "Healthcare": { evToEbitda: 5.0, debtToEbitda: 3.0 },
  "Technology": { evToEbitda: 8.5, debtToEbitda: 1.5 },
  "Consumer": { evToEbitda: 7.2, debtToEbitda: 2.2 },
  "Industrial": { evToEbitda: 6.0, debtToEbitda: 2.8 },
  "Financial": { evToEbitda: 4.5, debtToEbitda: 4.0 },
  "Multi-Sector": { evToEbitda: 6.5, debtToEbitda: 2.5 }
};

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
//new block
const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const pdfData = await pdfParse(dataBuffer);
    if (!pdfData.text || pdfData.text.trim().length < 10) {
      throw new Error("Empty PDF text");
    }
    return pdfData.text;
  } catch (err) {
    console.error("⚠️ PDF parse failed:", err.message);
    // Fallback: basic UTF-8 text attempt
    try {
      const rawText = dataBuffer.toString("utf8");
      console.warn("Using raw text fallback");
      return rawText;
    } catch {
      return "";
    }
  }
};

// const parsePDF = async (filePath) => {
//   const dataBuffer = fs.readFileSync(filePath);
//   const pdfData = await pdfParse(dataBuffer);
//   return pdfData.text;
// };

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
//new block
const extractFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) return null;

  console.log('CSV Headers:', Object.keys(csvData[0]));
  console.log('CSV Sample Row:', csvData[0]);

  // Normalize headers
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
  let totalNetIncome = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let currentAssets = 0;
  let currentLiabilities = 0;
  let cashFlow = 0;

  normalizedData.forEach(row => {
    const revenue = parseFloat(row.revenue || row.sales || row['total revenue'] || 0);
    const ebitda = parseFloat(row.ebitda || row.earnings || row['operating income'] || 0);
    const netIncome = parseFloat(row['net income'] || row['net profit'] || row.profit || 0);
    const assets = parseFloat(row['total assets'] || row.assets || 0);
    const liabilities = parseFloat(row['total liabilities'] || row.liabilities || row.debt || 0);
    const curAssets = parseFloat(row['current assets'] || 0);
    const curLiabilities = parseFloat(row['current liabilities'] || 0);
    const cash = parseFloat(row['cash flow'] || row['operating cash flow'] || 0);

    if (!isNaN(revenue)) totalRevenue += revenue;
    if (!isNaN(ebitda)) totalEbitda += ebitda;
    if (!isNaN(netIncome)) totalNetIncome += netIncome;
    if (!isNaN(assets)) totalAssets += assets;
    if (!isNaN(liabilities)) totalLiabilities += liabilities;
    if (!isNaN(curAssets)) currentAssets += curAssets;
    if (!isNaN(curLiabilities)) currentLiabilities += curLiabilities;
    if (!isNaN(cash)) cashFlow += cash;
  });

  // Estimates if missing
  if (totalNetIncome === 0 && totalEbitda > 0) {
    totalNetIncome = totalEbitda * 0.6;
  }
  if (cashFlow === 0 && totalEbitda > 0) {
    cashFlow = totalEbitda * 0.65;
  }
  if (currentAssets === 0 && totalAssets > 0) {
    currentAssets = totalAssets * 0.35;
  }
  if (currentLiabilities === 0 && totalLiabilities > 0) {
    currentLiabilities = totalLiabilities * 0.4;
  }

  // Calculate growth rate
  let revenueGrowth = 10;
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
    net_income: totalNetIncome || null,
    total_assets: totalAssets || null,
    total_liabilities: totalLiabilities || null,
    current_assets: currentAssets || null,
    current_liabilities: currentLiabilities || null,
    cash_flow: cashFlow || null,
    revenueGrowth: parseFloat(revenueGrowth) || null,
    dataSource: 'csv',
    rowCount: csvData.length
  };

  console.log('Extracted from CSV:', result);
  return result;
};
// const extractFromCSV = (csvData) => {
//   if (!csvData || csvData.length === 0) return null;

//   console.log('CSV Headers:', Object.keys(csvData[0]));
//   console.log('CSV Sample Row:', csvData[0]);

//   // Normalize headers (trim whitespace, lowercase)
//   const normalizedData = csvData.map(row => {
//     const normalized = {};
//     Object.keys(row).forEach(key => {
//       const normalizedKey = key.trim().toLowerCase();
//       normalized[normalizedKey] = row[key];
//     });
//     return normalized;
//   });

//   // Calculate totals
//   let totalRevenue = 0;
//   let totalEbitda = 0;
//   let totalDebt = 0;
//   let totalCapex = 0;

//   normalizedData.forEach(row => {
//     // Try different possible column names
//     const revenue = parseFloat(row.revenue || row.sales || row['total revenue'] || 0);
//     const ebitda = parseFloat(row.ebitda || row.earnings || row['operating income'] || 0);
//     const debt = parseFloat(row.debt || row.liabilities || row['total debt'] || 0);
//     const capex = parseFloat(row.capex || row['capital expenditure'] || row['cap ex'] || 0);

//     if (!isNaN(revenue)) totalRevenue += revenue;
//     if (!isNaN(ebitda)) totalEbitda += ebitda;
//     if (!isNaN(debt)) totalDebt += debt;
//     if (!isNaN(capex)) totalCapex += capex;
//   });

//   // Calculate growth rate (simple estimate based on first vs last row)
//   let revenueGrowth = 10; // default
//   if (normalizedData.length >= 2) {
//     const firstRevenue = parseFloat(normalizedData[0].revenue || normalizedData[0].sales || 0);
//     const lastRevenue = parseFloat(normalizedData[normalizedData.length - 1].revenue || 
//                                    normalizedData[normalizedData.length - 1].sales || 0);
    
//     if (firstRevenue > 0 && lastRevenue > 0) {
//       revenueGrowth = ((lastRevenue - firstRevenue) / firstRevenue * 100).toFixed(1);
//     }
//   }

//   const result = {
//     revenue: totalRevenue || null,
//     ebitda: totalEbitda || null,
//     debt: totalDebt || null,
//     capex: totalCapex || null,
//     revenueGrowth: parseFloat(revenueGrowth) || null,
//     dataSource: 'csv',
//     rowCount: csvData.length
//   };

//   console.log('Extracted from CSV:', result);
//   return result;
// };

// Extract from text (PDF content)
//new block
const extractFromText = (text) => {
  const lowerText = text.toLowerCase();
  
//new block (for beter parsing)
const patterns = {
  revenue: [
    /(?:total\s+)?revenue[:\s$]*([\d.,]+)/i,
    /revenue\s+([\d.,]+)/i,
    /(?:total\s+)?sales[:\s$]*([\d.,]+)/i
  ],
  ebitda: [
    /ebitda[:\s$]*([\d.,]+)/i,
    /ebitda\s+([\d.,]+)/i,
    /earnings[:\s$]*([\d.,]+)/i
  ],
  netIncome: [
    /net\s+income[:\s$]*([\d.,]+)/i,
    /net\s+profit[:\s$]*([\d.,]+)/i,
    /income\s+([\d.,]+)/i
  ],
  totalAssets: [
    /total\s+assets[:\s$]*([\d.,]+)/i,
    /assets\s+([\d.,]+)/i
  ],
  totalLiabilities: [
    /total\s+liabilities[:\s$]*([\d.,]+)/i,
    /liabilities\s+([\d.,]+)/i
  ],
  currentAssets: [
    /current\s+assets[:\s$]*([\d.,]+)/i
  ],
  currentLiabilities: [
    /current\s+liabilities[:\s$]*([\d.,]+)/i
  ],
  cashFlow: [
    /(?:operating\s+)?cash\s*flow[:\s$]*([\d.,]+)/i,
    /cash\s*flow\s+([\d.,]+)/i
  ],
  growth: [
    /(?:revenue\s+)?growth[:\s]+([\d.,]+)%?/i,
    /yoy[:\s]+([\d.,]+)%?/i
  ],
  sector: [
    /sector[:\s]+([a-zA-Z]+)/i
  ]
};

//   const patterns = {
//     revenue: [
//       /(?:total\s+)?revenue[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /(?:total\s+)?sales[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i
//     ],
//     ebitda: [
//       /ebitda[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /earnings[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
//     ],
//     netIncome: [
//       /net\s+income[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /net\s+profit[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
//     ],
//     totalAssets: [
//       /total\s+assets[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /assets[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
//     ],
//     totalLiabilities: [
//       /total\s+liabilities[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /liabilities[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
//     ],
//     currentAssets: [
//       /current\s+assets[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i
//     ],
//     currentLiabilities: [
//       /current\s+liabilities[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i
//     ],
//     cashFlow: [
//       /(?:operating\s+)?cash\s+flow[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i
//     ],
//     growth: [
//       /(?:revenue\s+)?growth[:\s]+(\d+(?:[\.,]\d+)?)%?/i,
//       /yoy[:\s]+(\d+(?:[\.,]\d+)?)%?/i
//     ]
//   };

  const extract = (patternList) => {
    for (const pattern of patternList) {
      const match = lowerText.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = match[2]?.toLowerCase();
        return unit && (unit.includes('b') || unit.includes('billion')) ? value * 1000 : value;
      }
    }
    return null;
  };

  const revenue = extract(patterns.revenue);
  const ebitda = extract(patterns.ebitda);
  const netIncome = extract(patterns.netIncome) || (ebitda ? ebitda * 0.6 : null);
  const totalAssets = extract(patterns.totalAssets);
  const totalLiabilities = extract(patterns.totalLiabilities);
  const currentAssets = extract(patterns.currentAssets) || (totalAssets ? totalAssets * 0.35 : null);
  const currentLiabilities = extract(patterns.currentLiabilities) || (totalLiabilities ? totalLiabilities * 0.4 : null);
  const cashFlow = extract(patterns.cashFlow) || (ebitda ? ebitda * 0.65 : null);

  const result = {
    revenue,
    ebitda,
    net_income: netIncome,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    current_assets: currentAssets,
    current_liabilities: currentLiabilities,
    cash_flow: cashFlow,
    revenueGrowth: extract(patterns.growth),
    dataSource: 'text'
  };

  console.log('Extracted from text:', result);
  return result;
};
// const extractFromText = (text) => {
//   const lowerText = text.toLowerCase();
  
//   const patterns = {
//     revenue: [
//       /(?:total\s+)?revenue[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /(?:total\s+)?sales[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /revenue[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)/i
//     ],
//     ebitda: [
//       /ebitda[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /earnings[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
//     ],
//     debt: [
//       /(?:total\s+)?debt[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b|billion|b\b)?/i,
//       /liabilities[:\s]+\$?\s*(\d+(?:[\.,]\d+)?)\s*(million|m\b)?/i
//     ],
//     growth: [
//       /(?:revenue\s+)?growth[:\s]+(\d+(?:[\.,]\d+)?)%?/i,
//       /yoy[:\s]+(\d+(?:[\.,]\d+)?)%?/i,
//       /year[- ]over[- ]year[:\s]+(\d+(?:[\.,]\d+)?)%?/i
//     ]
//   };

//   const extract = (patternList) => {
//     for (const pattern of patternList) {
//       const match = lowerText.match(pattern);
//       if (match) {
//         const value = parseFloat(match[1].replace(',', '.'));
//         const unit = match[2]?.toLowerCase();
//         // Convert billions to millions
//         return unit && (unit.includes('b') || unit.includes('billion')) ? value * 1000 : value;
//       }
//     }
//     return null;
//   };

//   const result = {
//     revenue: extract(patterns.revenue),
//     ebitda: extract(patterns.ebitda),
//     debt: extract(patterns.debt),
//     revenueGrowth: extract(patterns.growth),
//     dataSource: 'text'
//   };

//   console.log('Extracted from text:', result);
//   return result;
// };
//new block
// Calculate enhanced metrics
// Calculate enhanced metrics (safer numeric handling & zero-guards)
const calculateMetrics = (financialData) => {
  // Coerce to numbers (may be undefined -> NaN)
  const revenue = Number(financialData.revenue);
  const ebitda = Number(financialData.ebitda);
  const net_income = Number(financialData.net_income);
  const total_assets = Number(financialData.total_assets);
  const total_liabilities = Number(financialData.total_liabilities);
  const current_assets = Number(financialData.current_assets);
  const current_liabilities = Number(financialData.current_liabilities);
  const cash_flow = Number(financialData.cash_flow);

  // Profit Margin (%) — net_income / revenue * 100
  const profitMargin = (isFinite(net_income) && isFinite(revenue) && revenue !== 0)
    ? ((net_income / revenue) * 100).toFixed(1)
    : 'N/A';

  // Debt Ratio — total_liabilities / total_assets
  const debtRatio = (isFinite(total_liabilities) && isFinite(total_assets) && total_assets !== 0)
    ? (total_liabilities / total_assets).toFixed(2)
    : 'N/A';

  // Current Ratio — current_assets / current_liabilities
  const currentRatio = (isFinite(current_assets) && isFinite(current_liabilities) && current_liabilities !== 0)
    ? (current_assets / current_liabilities).toFixed(2)
    : 'N/A';

  // EV / EBITDA (Proxy) — ((total_assets + total_liabilities) / 2) / ebitda
  const evProxy = (isFinite(total_assets) && isFinite(total_liabilities) && isFinite(ebitda) && ebitda !== 0)
    ? (((total_assets + total_liabilities) / 2) / ebitda).toFixed(1)
    : 'N/A';

  // Debt-to-EBITDA — total_liabilities / ebitda
  const debtToEbitda = (isFinite(total_liabilities) && isFinite(ebitda) && ebitda !== 0)
    ? (total_liabilities / ebitda).toFixed(1)
    : 'N/A';

  // Cash Flow (direct) — round to 1 decimal
  const cashFlowValue = isFinite(cash_flow) ? Math.round(cash_flow * 10) / 10 : 'N/A';

  return {
    profitMargin,
    debtRatio,
    currentRatio,
    evToEbitda: evProxy,
    debtToEbitda,
    cashFlow: cashFlowValue,
    // Keep for backward compatibility and charts (return raw numbers where appropriate)
    revenue: isFinite(revenue) ? revenue : null,
    ebitda: isFinite(ebitda) ? ebitda : null,
    revenueGrowth: financialData.revenueGrowth ?? null
  };
};

// const calculateMetrics = (financialData) => {
//   const {
//     revenue,
//     ebitda,
//     net_income,
//     total_assets,
//     total_liabilities,
//     current_assets,
//     current_liabilities,
//     cash_flow
//   } = financialData;

//   // Profit Margin (%)
//   const profitMargin = net_income && revenue ? ((net_income / revenue) * 100).toFixed(1) : 'N/A';

//   // Debt Ratio
//   const debtRatio = total_liabilities && total_assets ? (total_liabilities / total_assets).toFixed(2) : 'N/A';

//   // Current Ratio
//   const currentRatio = current_assets && current_liabilities ? (current_assets / current_liabilities).toFixed(2) : 'N/A';

//   // EV / EBITDA (Proxy)
//   const evProxy = total_assets && total_liabilities && ebitda ? 
//     (((total_assets + total_liabilities) / 2) / ebitda).toFixed(1) : 'N/A';

//   // Debt-to-EBITDA
//   const debtToEbitda = total_liabilities && ebitda ? (total_liabilities / ebitda).toFixed(1) : 'N/A';

//   // Cash Flow (direct)
//   const cashFlowValue = cash_flow ? Math.round(cash_flow * 10) / 10 : 'N/A';

//   return {
//     profitMargin,
//     debtRatio,
//     currentRatio,
//     evToEbitda: evProxy,
//     debtToEbitda,
//     cashFlow: cashFlowValue,
//     // Keep for backward compatibility and charts
//     revenue,
//     ebitda,
//     revenueGrowth: financialData.revenueGrowth
//   };
// };

// Calculate deal summary with health score
//new block
const calculateDealSummary = (financialData, sector = 'Multi-Sector') => {
  const benchmark = sectorBenchmarks[sector] || sectorBenchmarks['Multi-Sector'];
  
  const {
    ebitda,
    total_assets,
    total_liabilities
  } = financialData;

  // Calculate valuation (EV/EBITDA proxy)
  const evProxy = total_assets && total_liabilities && ebitda ? 
    ((total_assets + total_liabilities) / 2) / ebitda : null;

  // Calculate debt-to-EBITDA
  const debtToEbitda = total_liabilities && ebitda ? total_liabilities / ebitda : null;

  // Implied EV
  const impliedEV = total_assets && total_liabilities ? 
    Math.round((total_assets + total_liabilities) / 2) : null;

  // Valuation assessment
  let valuationStatus = 'Fair Value';
  if (evProxy && benchmark.evToEbitda) {
    if (evProxy < benchmark.evToEbitda * 0.85) {
      valuationStatus = 'Undervalued';
    } else if (evProxy > benchmark.evToEbitda * 1.15) {
      valuationStatus = 'Overvalued';
    }
  }

  // Deal signal
  let dealSignal = 'Neutral';
  if (valuationStatus === 'Undervalued' && debtToEbitda && debtToEbitda < benchmark.debtToEbitda) {
    dealSignal = 'Attractive';
  } else if (valuationStatus === 'Overvalued' || (debtToEbitda && debtToEbitda > benchmark.debtToEbitda * 1.5)) {
    dealSignal = 'Cautious';
  }

  // Calculate health score (0-100)
  let healthScore = 50;

  // Valuation component (0-30 points)
  if (evProxy && benchmark.evToEbitda) {
    const valuationRatio = evProxy / benchmark.evToEbitda;
    if (valuationRatio < 0.7) healthScore += 30;
    else if (valuationRatio < 0.85) healthScore += 25;
    else if (valuationRatio < 1.0) healthScore += 20;
    else if (valuationRatio < 1.15) healthScore += 10;
  } else {
    healthScore += 15;
  }

  // Leverage component (0-30 points)
  if (debtToEbitda && benchmark.debtToEbitda) {
    const leverageRatio = debtToEbitda / benchmark.debtToEbitda;
    if (leverageRatio < 0.7) healthScore += 30;
    else if (leverageRatio < 0.9) healthScore += 25;
    else if (leverageRatio < 1.1) healthScore += 20;
    else if (leverageRatio < 1.3) healthScore += 10;
  } else {
    healthScore += 15;
  }

  // Profitability component (0-20 points)
  if (financialData.net_income && financialData.revenue) {
    const margin = (financialData.net_income / financialData.revenue) * 100;
    if (margin > 15) healthScore += 20;
    else if (margin > 10) healthScore += 15;
    else if (margin > 5) healthScore += 10;
    else healthScore += 5;
  } else {
    healthScore += 10;
  }

  healthScore = Math.min(100, healthScore);

  // Health status
  let healthStatus = '🟢 Strong';
  if (healthScore < 60) healthStatus = '🔴 Weak';
  else if (healthScore < 75) healthStatus = '🟡 Moderate';

  // Generate insight
  let insight = 'Company shows balanced financial profile.';
  if (valuationStatus === 'Undervalued' && dealSignal === 'Attractive') {
    insight = `Company trading below sector multiple; attractive leverage profile with ${evProxy?.toFixed(1)}x vs sector average ${benchmark.evToEbitda}x.`;
  } else if (valuationStatus === 'Overvalued') {
    insight = `Company trading above sector average; premium valuation may reflect growth expectations or sector positioning.`;
  } else if (debtToEbitda && debtToEbitda > benchmark.debtToEbitda * 1.3) {
    insight = `Elevated leverage levels require attention; debt-to-EBITDA of ${debtToEbitda.toFixed(1)}x exceeds sector norm.`;
  }

  return {
    healthScore: Math.round(healthScore),
    healthStatus,
    dealSignal,
    valuationStatus,
    evToEbitda: evProxy ? evProxy.toFixed(1) : 'N/A',
    sectorAvgEV: benchmark.evToEbitda.toFixed(1),
    impliedEV: impliedEV ? `$${impliedEV}M` : 'N/A',
    insight
  };
};

//new block
const generateDealSignalExplanation = async (financialData, dealSummary, sector) => {
  try {
    const prompt = `
You are a private equity analyst. 
Explain in 2–3 sentences why this deal has been rated as "${dealSummary.dealSignal}" based on its financial metrics and overall performance.
Provide a fair, objective explanation, and end your response with the phrase: "Hence, it is a ${dealSummary.dealSignal} deal."

Deal Metrics:
- Revenue: $${financialData.revenue}M
- EBITDA: $${financialData.ebitda}M
- Debt-to-EBITDA: ${financialData.total_liabilities && financialData.ebitda ? (financialData.total_liabilities / financialData.ebitda).toFixed(1) : 'N/A'}x
- Health Score: ${dealSummary.healthScore}/100
- Deal Signal: ${dealSummary.dealSignal}
- Valuation Status: ${dealSummary.valuationStatus}
- EV/EBITDA: ${dealSummary.evToEbitda}x (Sector Avg: ${dealSummary.sectorAvgEV}x)
- Sector: ${sector}

Provide a 2–3 sentence explanation of WHY this deal is categorized as "${dealSummary.dealSignal}". Focus on the key financial metrics that drove this rating. Be specific and concise.

Return only the explanation text, no JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        candidateCount: 1
      }
    });

    const explanation =
      response?.text ||
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      `This ${dealSummary.dealSignal.toLowerCase()} deal rating reflects ${dealSummary.valuationStatus.toLowerCase()} valuation at ${dealSummary.evToEbitda}x EV/EBITDA (sector avg: ${dealSummary.sectorAvgEV}x) with leverage considerations.`;

    return explanation.trim();

  } catch (error) {
    console.error("Signal explanation generation error:", error.message);
    return `This ${dealSummary.dealSignal.toLowerCase()} deal rating reflects ${dealSummary.valuationStatus.toLowerCase()} valuation at ${dealSummary.evToEbitda}x EV/EBITDA (sector avg: ${dealSummary.sectorAvgEV}x).`;
  }
};

// Mock AI analysis fallback

//new block
const mockAIAnalysis = (financialData, fileName, sector) => {
  const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
  
  const revenue = financialData.revenue || 100;
  const ebitda = financialData.ebitda || 20;
  const netIncome = financialData.net_income || 15;
  const growth = financialData.revenueGrowth || 10;
  
  const metrics = calculateMetrics(financialData);
  const dealSummary = calculateDealSummary(financialData, sector);
  
  return {
    summary: `${companyName} demonstrates solid financial performance with $${revenue}M in revenue and ${growth}% YoY growth. The company maintains a ${metrics.profitMargin}% profit margin with EBITDA of $${ebitda}M. Current leverage profile shows ${metrics.debtToEbitda}x Debt-to-EBITDA ratio. ${dealSummary.insight}`,
    risks: [
      `Leverage ratio of ${metrics.debtToEbitda}x may limit financial flexibility during market downturns`,
      'Market competition and pricing pressure in key segments could impact margins',
      'Dependency on economic conditions and sector-specific headwinds'
    ],
    opportunities: [
      `Growth trajectory of ${growth}% YoY indicates strong market positioning and execution`,
      'Operational efficiency improvements could enhance EBITDA margins',
      `${dealSummary.valuationStatus} presents potential for value creation through strategic initiatives`
    ],
    metrics,
    dealSummary
  };
};
// const mockAIAnalysis = (financialData, fileName, sector) => {
//   const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
  
//   const revenue = financialData.revenue || 100;
//   const ebitda = financialData.ebitda || 20;
//   const debt = financialData.debt || 30;
//   const growth = financialData.revenueGrowth || 10;
  
//   return {
//     summary: `${companyName} shows financial performance with ${growth}% YoY growth. EBITDA margin of ${(ebitda / revenue * 100).toFixed(1)}%. Total revenue of $${revenue}M across segments with debt levels at $${debt}M.` ,
//     risks: [
//       `Leverage ratio of ${(debt / revenue).toFixed(2)} may limit financial flexibility`,
//       'Market competition and pricing pressure in key segments',
//       'Dependency on economic conditions and commodity prices'
//     ],
//     opportunities: [
//       `Growth potential indicated by ${growth}% YoY trajectory`,
//       'Operational efficiency improvements possible',
//       'Market expansion and diversification opportunities'
//     ],
//     metrics: {
//       revenue: revenue,
//       revenueGrowth: growth,
//       ebitda: ebitda,
//       debt: debt,
//       cashFlow: Math.round(ebitda * 0.65 * 100) / 100,
//       valuation: Math.round(revenue * 1.2),
//       debtRatio: (debt / revenue).toFixed(2),
//       profitMargin: ((ebitda / revenue) * 100).toFixed(1)
//     }
//   };
// };

// ---- Replace OpenAI call with Gemini (Google Gen AI) ----
//new block
const analyzeDealWithAI = async (fileContent, financialData, fileName, sector = 'Multi-Sector') => {
  try {
    const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
    
    // Prepare content snippet
    const contentSnippet = typeof fileContent === 'string' 
      ? fileContent.substring(0, 2000) 
      : JSON.stringify(fileContent).substring(0, 2000);

    const metrics = calculateMetrics(financialData);
    const dealSummary = calculateDealSummary(financialData, sector);

    const prompt = `You are a private equity analyst. Analyze this financial deal document and provide insights.

Company: ${companyName}
Sector: ${sector}

Financial Metrics:
- Revenue: $${financialData.revenue}M
- EBITDA: $${financialData.ebitda}M
- Net Income: $${financialData.net_income}M
- Total Assets: $${financialData.total_assets}M
- Total Liabilities: $${financialData.total_liabilities}M
- Revenue Growth: ${financialData.revenueGrowth}%
- Profit Margin: ${metrics.profitMargin}%
- Debt Ratio: ${metrics.debtRatio}
- Current Ratio: ${metrics.currentRatio}
- EV/EBITDA: ${metrics.evToEbitda}x
- Debt-to-EBITDA: ${metrics.debtToEbitda}x

Deal Assessment:
- Health Score: ${dealSummary.healthScore}/100
- Valuation: ${dealSummary.valuationStatus}
- Deal Signal: ${dealSummary.dealSignal}

Document Excerpt:
${contentSnippet}

Please provide a JSON response with:
{
  "summary": "A 2-3 sentence executive summary highlighting key financial performance, valuation positioning, and strategic outlook",
  "risks": ["Risk 1 (specific financial or operational concern)", "Risk 2", "Risk 3"],
  "opportunities": ["Opportunity 1 (specific growth or efficiency potential)", "Opportunity 2", "Opportunity 3"]
}

Be specific and professional. Reference actual metrics and the deal assessment where possible.`;

    console.log('Calling Gemini API...');

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const rawText = response?.text 
      || response?.candidates?.[0]?.content?.parts?.[0]?.text 
      || JSON.stringify(response);

    console.log('Gemini raw response:', rawText);

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
      throw new Error('Failed to parse Gemini response as JSON');
    }
    //new block
    return {
      summary: analysis.summary || mockAIAnalysis(financialData, fileName, sector).summary,
      risks: analysis.risks || mockAIAnalysis(financialData, fileName, sector).risks,
      opportunities: analysis.opportunities || mockAIAnalysis(financialData, fileName, sector).opportunities,
      metrics,
      dealSummary,
      signalExplanation: analysis.signalExplanation || `This ${dealSummary.dealSignal.toLowerCase()} deal rating reflects ${dealSummary.valuationStatus.toLowerCase()} valuation at ${dealSummary.evToEbitda}x EV/EBITDA (sector avg: ${dealSummary.sectorAvgEV}x) with ${metrics.debtToEbitda}x leverage. Health score of ${dealSummary.healthScore}/100 indicates ${dealSummary.healthStatus.toLowerCase().replace(/[🟢🟡🔴]/g, '').trim()} fundamentals.`
    };
    // return {
    //   summary: analysis.summary || mockAIAnalysis(financialData, fileName, sector).summary,
    //   risks: analysis.risks || mockAIAnalysis(financialData, fileName, sector).risks,
    //   opportunities: analysis.opportunities || mockAIAnalysis(financialData, fileName, sector).opportunities,
    //   metrics,
    //   dealSummary
    // };
    
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    console.log('Falling back to mock analysis');
    return mockAIAnalysis(financialData, fileName, sector);
  }
};
// const analyzeDealWithAI = async (fileContent, financialData, fileName) => {
//   try {
//     const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").replace(/([A-Z])/g, ' $1').trim();
    
//     // Prepare content snippet
//     const contentSnippet = typeof fileContent === 'string' 
//       ? fileContent.substring(0, 2000) 
//       : JSON.stringify(fileContent).substring(0, 2000);

//     const prompt = `You are a private equity analyst. Analyze this financial deal document and provide insights.

// Company: ${companyName}
// Financial Metrics:
// - Revenue: $${financialData.revenue}M
// - EBITDA: $${financialData.ebitda}M
// - Debt: $${financialData.debt}M
// - Revenue Growth: ${financialData.revenueGrowth}%

// Document Excerpt:
// ${contentSnippet}

// Please provide a JSON response with:
// {
//   "summary": "A 2-3 sentence executive summary highlighting key financial performance, growth trajectory, and market position",
//   "risks": ["Risk 1 (specific financial or operational concern)", "Risk 2", "Risk 3"],
//   "opportunities": ["Opportunity 1 (specific growth or efficiency potential)", "Opportunity 2", "Opportunity 3"]
// }

// Be specific and professional. Reference actual metrics where possible.`;

//     console.log('Calling Gemini API...');

//     // Use Gemini (Google Gen AI SDK)
//     const response = await ai.models.generateContent({
//       model: "gemini-2.5-flash", // pick a Gemini model available to your key
//       contents: [
//         {
//           role: "user",
//           parts: [
//             { text: "You are a senior financial analyst specializing in private equity deal analysis. Provide concise, data-driven insights." }
//           ]
//         },
//         {
//           role: "user",
//           parts: [
//             { text: prompt }
//           ]
//         }
//       ],
//       config: {
//         candidateCount: 1
//       }
//     });

//     // The SDK typically exposes `response.text` (or candidates array). Be robust:
//     const rawText = response?.text 
//       || response?.candidates?.[0]?.content?.parts?.[0]?.text 
//       || JSON.stringify(response);

//     console.log('Gemini raw response:', rawText);

//     // Try to parse JSON directly; fallback to extracting JSON substring
//     let analysis = null;
//     try {
//       analysis = JSON.parse(rawText);
//     } catch (e) {
//       const jsonMatch = rawText.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         try {
//           analysis = JSON.parse(jsonMatch[0]);
//         } catch (e2) {
//           analysis = null;
//         }
//       }
//     }

//     if (!analysis) {
//       // If parsing fails, fallback to mock analysis (keeps behavior identical)
//       throw new Error('Failed to parse Gemini response as JSON');
//     }
//     //new block
//     const metrics = calculateMetrics(financialData);
// const dealSummary = calculateDealSummary(financialData, sector);

// return {
//   summary: analysis.summary || mockAIAnalysis(financialData, fileName, sector).summary,
//   risks: analysis.risks || mockAIAnalysis(financialData, fileName, sector).risks,
//   opportunities: analysis.opportunities || mockAIAnalysis(financialData, fileName, sector).opportunities,
//   metrics,
//   dealSummary
// };
//     // return {
//     //   summary: analysis.summary || mockAIAnalysis(financialData, fileName).summary,
//     //   risks: analysis.risks || mockAIAnalysis(financialData, fileName).risks,
//     //   opportunities: analysis.opportunities || mockAIAnalysis(financialData, fileName).opportunities,
//     //   metrics: {
//     //     revenue: financialData.revenue,
//     //     revenueGrowth: financialData.revenueGrowth,
//     //     ebitda: financialData.ebitda,
//     //     debt: financialData.debt,
//     //     cashFlow: Math.round(financialData.ebitda * 0.65 * 10) / 10,
//     //     valuation: Math.round(financialData.revenue * 1.2),
//     //     debtRatio: (financialData.debt / financialData.revenue).toFixed(2),
//     //     profitMargin: ((financialData.ebitda / financialData.revenue) * 100).toFixed(1)
//     //   }
//     // };
    
//   } catch (error) {
//     console.error('Gemini API Error:', error.message);
//     console.log('Falling back to mock analysis');
//     return mockAIAnalysis(financialData, fileName);
//   }
// };

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
    
    // Get sector from request body (default to Multi-Sector)
    const sector = req.body.sector || 'Multi-Sector';

    // Get AI analysis
    console.log('Starting AI analysis...');
    const aiAnalysis = await analyzeDealWithAI(fileContent, financialData, uploaded[0].originalname, sector);
    console.log('AI analysis complete');
    
    // Create quarterly breakdown (distribute totals across quarters)
    const quarterlyBreakdown = [0.22, 0.24, 0.26, 0.28];
    
    // Create complete deal data
    const dealData = {
      id: dealId,
      companyName: aiAnalysis.summary.split(' ')[0] + ' Corp.',
      dealName: 'Financial Analysis Report',
      dateUploaded: new Date().toISOString(),
      industry: sector,
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
      fileName: uploaded[0].originalname,
      healthScore: aiAnalysis.dealSummary.healthScore
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

//new block
// Q&A endpoint for deal-specific questions
app.post('/api/deals/:dealId/ask', async (req, res) => {
  try {
    const { dealId } = req.params;
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const deal = dealsCache.get(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Build context from deal data
    const context = `
Deal: ${deal.companyName}
Sector: ${deal.industry}
Summary: ${deal.summary}

Financial Metrics:
- Revenue: $${deal.metrics.revenue}M
- EBITDA: $${deal.metrics.ebitda}M
- Revenue Growth: ${deal.metrics.revenueGrowth}%
- Profit Margin: ${deal.metrics.profitMargin}%
- Debt Ratio: ${deal.metrics.debtRatio}
- Current Ratio: ${deal.metrics.currentRatio}
- EV/EBITDA: ${deal.metrics.evToEbitda}x
- Debt-to-EBITDA: ${deal.metrics.debtToEbitda}x
- Cash Flow: $${deal.metrics.cashFlow}M

Deal Assessment:
- Health Score: ${deal.dealSummary.healthScore}/100 (${deal.dealSummary.healthStatus})
- Deal Signal: ${deal.dealSummary.dealSignal}
- Valuation: ${deal.dealSummary.valuationStatus}
- EV/EBITDA vs Sector: ${deal.dealSummary.evToEbitda}x vs ${deal.dealSummary.sectorAvgEV}x

Key Risks:
${deal.risks.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Key Opportunities:
${deal.opportunities.map((o, i) => `${i + 1}. ${o}`).join('\n')}
`;

    const prompt = `You are a private equity analyst assistant. Answer the following question about this deal concisely in 1-2 sentences.

${context}

User Question: ${question}

Provide a direct, specific answer based on the deal data above. Reference actual numbers and metrics where relevant.`;

    console.log('Processing Q&A for deal:', dealId);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        candidateCount: 1
      }
    });

    const answer = response?.text 
      || response?.candidates?.[0]?.content?.parts?.[0]?.text 
      || "I couldn't generate an answer. Please try rephrasing your question.";

    res.json({ 
      question,
      answer: answer.trim(),
      dealId 
    });

  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({ error: 'Failed to process question: ' + error.message });
  }
});

//new block
// New endpoint: Compare two deals and generate AI investment summary
app.post('/api/deals/compare', async (req, res) => {
  try {
    const { dealA, dealB } = req.body;
    if (!dealA || !dealB) {
      return res.status(400).json({ error: 'Both deals are required for comparison' });
    }

    const prompt = `
You are a private equity analyst comparing two deals. 
Based on the given financial data and deal signals, determine which deal appears to be the better investment opportunity and explain why in 2–3 sentences.

Deal A:
- Company: ${dealA.companyName}
- Deal Signal: ${dealA.dealSummary.dealSignal}
- Health Score: ${dealA.dealSummary.healthScore}
- Valuation: ${dealA.dealSummary.valuationStatus}
- EV/EBITDA: ${dealA.dealSummary.evToEbitda}x
- Sector Avg EV/EBITDA: ${dealA.dealSummary.sectorAvgEV}x

Deal B:
- Company: ${dealB.companyName}
- Deal Signal: ${dealB.dealSummary.dealSignal}
- Health Score: ${dealB.dealSummary.healthScore}
- Valuation: ${dealB.dealSummary.valuationStatus}
- EV/EBITDA: ${dealB.dealSummary.evToEbitda}x
- Sector Avg EV/EBITDA: ${dealB.dealSummary.sectorAvgEV}x

Explain which deal is more investible and why. End with:
"Hence, ${companyName} is the better investment deal."`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ comparisonSummary: text?.trim() || 'AI could not generate comparison summary.' });
  } catch (error) {
    console.error('Compare summary error:', error.message);
    res.status(500).json({ error: 'Failed to generate comparison summary.' });
  }
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
