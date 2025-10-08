const fs = require('fs');
const csv = require('csv-parser');
const pdfParse = require('pdf-parse');

// Parse CSV
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
  try {
    const pdfData = await pdfParse(dataBuffer);
    if (!pdfData.text || pdfData.text.trim().length < 10) {
      throw new Error('Empty PDF text');
    }
    return pdfData.text;
  } catch (err) {
    console.error('PDF parse failed:', err.message);
    try {
      const rawText = dataBuffer.toString('utf8');
      return rawText;
    } catch {
      return '';
    }
  }
};

// Extraction helpers
const extractFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) return null;

  const normalizedData = csvData.map(row => {
    const normalized = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = key.trim().toLowerCase();
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });

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

  if (totalNetIncome === 0 && totalEbitda > 0) totalNetIncome = totalEbitda * 0.6;
  if (cashFlow === 0 && totalEbitda > 0) cashFlow = totalEbitda * 0.65;
  if (currentAssets === 0 && totalAssets > 0) currentAssets = totalAssets * 0.35;
  if (currentLiabilities === 0 && totalLiabilities > 0) currentLiabilities = totalLiabilities * 0.4;

  let revenueGrowth = 10;
  if (normalizedData.length >= 2) {
    const firstRevenue = parseFloat(normalizedData[0].revenue || normalizedData[0].sales || 0);
    const lastRevenue = parseFloat(normalizedData[normalizedData.length - 1].revenue || normalizedData[normalizedData.length - 1].sales || 0);
    if (firstRevenue > 0 && lastRevenue > 0) revenueGrowth = ((lastRevenue - firstRevenue) / firstRevenue * 100).toFixed(1);
  }

  return {
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
};

const extractFromText = (text) => {
  const lowerText = text.toLowerCase();
  const patterns = {
    revenue: [/(?:total\s+)?revenue[:\s$]*([\d.,]+)/i, /revenue\s+([\d.,]+)/i, /(?:total\s+)?sales[:\s$]*([\d.,]+)/i],
    ebitda: [/ebitda[:\s$]*([\d.,]+)/i, /ebitda\s+([\d.,]+)/i, /earnings[:\s$]*([\d.,]+)/i],
    netIncome: [/net\s+income[:\s$]*([\d.,]+)/i, /net\s+profit[:\s$]*([\d.,]+)/i, /income\s+([\d.,]+)/i],
    totalAssets: [/total\s+assets[:\s$]*([\d.,]+)/i, /assets\s+([\d.,]+)/i],
    totalLiabilities: [/total\s+liabilities[:\s$]*([\d.,]+)/i, /liabilities\s+([\d.,]+)/i],
    currentAssets: [/current\s+assets[:\s$]*([\d.,]+)/i],
    currentLiabilities: [/current\s+liabilities[:\s$]*([\d.,]+)/i],
    cashFlow: [/(?:operating\s+)?cash\s*flow[:\s$]*([\d.,]+)/i, /cash\s*flow\s+([\d.,]+)/i],
    growth: [/(?:revenue\s+)?growth[:\s]+([\d.,]+)%?/i, /yoy[:\s]+([\d.,]+)%?/i],
    sector: [/sector[:\s]+([a-zA-Z]+)/i]
  };

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

  return {
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
};

const extractFinancialDataSmart = (content) => {
  if (Array.isArray(content)) return extractFromCSV(content);
  if (typeof content === 'string') return extractFromText(content);
  return null;
};

module.exports = {
  parseCSV,
  parsePDF,
  extractFromCSV,
  extractFromText,
  extractFinancialDataSmart
};
