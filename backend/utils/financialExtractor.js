// utils/financialExtractor.js
const { parseCSV, parsePDF } = require('./fileParser');

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

//new block
/**
 * Safely parse numeric values from strings with various formats
 * Handles: "1,000", "$1000", "1.5M", "2.3B", "(500)" (negative), etc.
 */
const parseFinancialNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  
  // Convert to string and clean
  let str = String(value)
    .trim()
    .replace(/[\$€£¥,\s]/g, '')  // Remove currency symbols, commas, spaces
    .replace(/[()]/g, '-');       // Convert parentheses to negative
  
  // Handle percentage (convert to decimal if needed for margins)
  const isPercentage = str.includes('%');
  str = str.replace('%', '');
  
  // Handle unit multipliers (M = million, B = billion, K = thousand)
  let multiplier = 1;
  if (/[mM]$/i.test(str)) {
    multiplier = 1;  // Already in millions
    str = str.replace(/[mM]$/i, '');
  } else if (/[bB]$/i.test(str)) {
    multiplier = 1000;  // Convert billions to millions
    str = str.replace(/[bB]$/i, '');
  } else if (/[kK]$/i.test(str)) {
    multiplier = 0.001;  // Convert thousands to millions
    str = str.replace(/[kK]$/i, '');
  }
  
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  
  return isPercentage ? num : num * multiplier;
};


// Extract from CSV data
//new block
const extractFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) return null;

  console.log('CSV Headers:', Object.keys(csvData[0]));
  console.log('CSV Sample Row:', csvData[0]);

  // Normalize headers
  //new block
  const normalizedData = csvData.map(row => {
  const normalized = {};
  Object.keys(row).forEach(key => {
    // Step 1: Clean and normalize header
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .replace(/[\$%\(\)\[\]\{\}]/g, '')           // Remove currency/percentage symbols & brackets
      .replace(/\b(in\s+)?(millions?|thousands?|m|k|usd|dollars?)\b/gi, '') // Remove unit descriptors
      .replace(/[^a-z0-9\s]/g, '')                  // Remove remaining special chars
      .replace(/\s+/g, '_')                         // Replace spaces with underscores
      .replace(/^_+|_+$/g, '');                     // Trim leading/trailing underscores
    
    normalized[normalizedKey] = row[key];
  });
  return normalized;
});
console.log('📊 CSV Extraction Debug:');
console.log('  - Original headers:', Object.keys(csvData[0]));
console.log('  - Normalized headers:', Object.keys(normalizedData[0]));
console.log('  - Sample row:', normalizedData[0]);
  // const normalizedData = csvData.map(row => {
  //   const normalized = {};
  //   Object.keys(row).forEach(key => {
  //     //new block
  //     const normalizedKey = key
  //       .trim()
  //       .toLowerCase()
  //       .replace(/[^a-z0-9 ]/g, '')    // remove symbols like $, %, (), etc.
  //       .replace(/\s+/g, '_');          // replace spaces with underscores
  //     // const normalizedKey = key.trim().toLowerCase();
  //     normalized[normalizedKey] = row[key];
  //   });
  //   return normalized;
  // });

  // Calculate totals
  let totalRevenue = 0;
  let totalEbitda = 0;
  let totalNetIncome = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;
  let currentAssets = 0;
  let currentLiabilities = 0;
  let cashFlow = 0;

  //new block
  normalizedData.forEach(row => {
  // Try multiple possible column names for each metric
  const revenue = parseFinancialNumber(
    row.revenue || row.sales || row.total_revenue || 
    row.total_sales || row.revenues || row.net_sales || 0
  );
  
  const ebitda = parseFinancialNumber(
    row.ebitda || row.earnings || row.operating_income || 
    row.operating_profit || row.op_income || row.ebit || 0
  );
  
  const netIncome = parseFinancialNumber(
    row.net_income || row.net_profit || row.profit || 
    row.net_earnings || row.income || row.earnings || 0
  );
  
  const assets = parseFinancialNumber(
    row.total_assets || row.assets || row.total_asset || 0
  );
  
  const liabilities = parseFinancialNumber(
    row.total_liabilities || row.liabilities || row.debt || 
    row.total_debt || row.total_liability || row.long_term_debt || 0
  );
  
  const curAssets = parseFinancialNumber(
    row.current_assets || row.current_asset || 0
  );
  
  const curLiabilities = parseFinancialNumber(
    row.current_liabilities || row.current_liability || 0
  );
  
  const cash = parseFinancialNumber(
    row.cash_flow || row.operating_cash_flow || 
    row.cashflow || row.ocf || row.cash || 0
  );

  if (revenue) totalRevenue += revenue;
  if (ebitda) totalEbitda += ebitda;
  if (netIncome) totalNetIncome += netIncome;
  if (assets) totalAssets += assets;
  if (liabilities) totalLiabilities += liabilities;
  if (curAssets) currentAssets += curAssets;
  if (curLiabilities) currentLiabilities += curLiabilities;
  if (cash) cashFlow += cash;
});
  // normalizedData.forEach(row => {
  //   const revenue = parseFloat(row.revenue || row.sales || row['total revenue'] || 0);
  //   const ebitda = parseFloat(row.ebitda || row.earnings || row['operating income'] || 0);
  //   const netIncome = parseFloat(row['net income'] || row['net profit'] || row.profit || 0);
  //   const assets = parseFloat(row['total assets'] || row.assets || 0);
  //   const liabilities = parseFloat(row['total liabilities'] || row.liabilities || row.debt || 0);
  //   const curAssets = parseFloat(row['current assets'] || 0);
  //   const curLiabilities = parseFloat(row['current liabilities'] || 0);
  //   const cash = parseFloat(row['cash flow'] || row['operating cash flow'] || 0);

  //   if (!isNaN(revenue)) totalRevenue += revenue;
  //   if (!isNaN(ebitda)) totalEbitda += ebitda;
  //   if (!isNaN(netIncome)) totalNetIncome += netIncome;
  //   if (!isNaN(assets)) totalAssets += assets;
  //   if (!isNaN(liabilities)) totalLiabilities += liabilities;
  //   if (!isNaN(curAssets)) currentAssets += curAssets;
  //   if (!isNaN(curLiabilities)) currentLiabilities += curLiabilities;
  //   if (!isNaN(cash)) cashFlow += cash;
  // });

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
/**
 * Extract financial data from table-like text structures
 * Handles PDFs where metrics are in tables/rows with numbers in columns
 */
const extractFromTableText = (text) => {
  const lines = text.split('\n');
  const data = {
    revenue: null,
    ebitda: null,
    net_income: null,
    total_assets: null,
    total_liabilities: null,
    cash_flow: null,
    revenueGrowth: null
  };

  // Look for table rows with metric names followed by numbers
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Extract numbers from the line (handles formats like "4,850" or "5.42")
    const numbers = line.match(/[\d,]+\.?\d*/g);
    
    if (!numbers || numbers.length === 0) return;
    
    // Helper to get the most relevant number (usually the latest/rightmost)
    const getLatestValue = () => {
      // Try to find a number that's not a percentage or year
      const validNumbers = numbers.filter(n => {
        const num = parseFloat(n.replace(/,/g, ''));
        return num > 0 && num < 100000; // Reasonable range for our metrics
      });
      return validNumbers.length > 0 ? validNumbers[validNumbers.length - 1] : numbers[0];
    };

    // Revenue patterns
    if (/total\s+revenue|revenue\s*\(/i.test(lowerLine) && !data.revenue) {
      const value = getLatestValue();
      data.revenue = parseFinancialNumber(value);
      
      // Check if it's in billions (by looking for ($B) or "billion" in the line)
      if (/\(\$b\)|billion/i.test(lowerLine)) {
        data.revenue = data.revenue * 1000; // Convert to millions
      }
    }
    
    // EBITDA patterns
    if (/ebitda/i.test(lowerLine) && !data.ebitda) {
      const value = getLatestValue();
      data.ebitda = parseFinancialNumber(value);
      
      if (/\(\$b\)|billion/i.test(lowerLine)) {
        data.ebitda = data.ebitda * 1000;
      }
    }
    
    // Net Income patterns
    if (/net\s+income/i.test(lowerLine) && !data.net_income) {
      const value = getLatestValue();
      data.net_income = parseFinancialNumber(value);
      
      if (/\(\$b\)|billion/i.test(lowerLine)) {
        data.net_income = data.net_income * 1000;
      }
    }
    
    // Total Assets patterns
    if (/total\s+assets/i.test(lowerLine) && !data.total_assets) {
      const value = getLatestValue();
      data.total_assets = parseFinancialNumber(value);
      
      if (/\(\$b\)|billion/i.test(lowerLine)) {
        data.total_assets = data.total_assets * 1000;
      }
    }
    
    // Total Liabilities patterns
    if (/total\s+liabilities/i.test(lowerLine) && !data.total_liabilities) {
      const value = getLatestValue();
      data.total_liabilities = parseFinancialNumber(value);
      
      if (/\(\$b\)|billion/i.test(lowerLine)) {
        data.total_liabilities = data.total_liabilities * 1000;
      }
    }
    
    // Cash Flow patterns
    if (/cash\s+flow/i.test(lowerLine) && !data.cash_flow) {
      const value = getLatestValue();
      data.cash_flow = parseFinancialNumber(value);
      
      if (/\(\$b\)|billion/i.test(lowerLine)) {
        data.cash_flow = data.cash_flow * 1000;
      }
    }
    
    // Revenue Growth patterns
    if (/revenue\s+growth|yoy/i.test(lowerLine) && !data.revenueGrowth) {
      // Look for percentage values
      const percentMatch = line.match(/([\d.]+)%/);
      if (percentMatch) {
        data.revenueGrowth = parseFloat(percentMatch[1]);
      }
    }
  });

  // Check if we found any data
  const hasData = Object.values(data).some(v => v !== null);
  
  if (hasData) {
    console.log('✓ Extracted from table structure:', data);
    return data;
  }
  
  return null;
};
//new block
const extractFromText = (text) => {
  // FIRST: Try table-based extraction (for structured PDFs)
  const tableData = extractFromTableText(text);
  if (tableData && tableData.revenue) {
    console.log('✓ Used table-based extraction');
    
    // Apply estimates for missing metrics
    if (!tableData.net_income && tableData.ebitda) {
      tableData.net_income = tableData.ebitda * 0.6;
    }
    if (!tableData.cash_flow && tableData.ebitda) {
      tableData.cash_flow = tableData.ebitda * 0.65;
    }
    if (!tableData.current_assets && tableData.total_assets) {
      tableData.current_assets = tableData.total_assets * 0.35;
    }
    if (!tableData.current_liabilities && tableData.total_liabilities) {
      tableData.current_liabilities = tableData.total_liabilities * 0.4;
    }
    
    tableData.dataSource = 'text-table';
    return tableData;
  }
  
  // FALLBACK: Try regex pattern-based extraction
  console.log('⚠️ Table extraction failed, trying pattern matching...');
  const lowerText = text.toLowerCase();
  
//new block (for beter parsing)
// REPLACE THE patterns OBJECT WITH THIS ENHANCED VERSION:
const patterns = {
  revenue: [
    /(?:total\s+)?(?:net\s+)?revenue[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /(?:total\s+)?(?:net\s+)?sales[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /revenues?[:\s]+[\$€£¥]?\s*([\d,]+\.?\d*)/gi
  ],
  ebitda: [
    /ebitda[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /earnings?\s+before[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)/gi,
    /operating\s+(?:income|profit)[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)/gi
  ],
  netIncome: [
    /net\s+(?:income|profit|earnings?)[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /(?:after[\-\s]tax\s+)?income[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)/gi
  ],
  totalAssets: [
    /total\s+assets[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /assets[:\s]+[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi
  ],
  totalLiabilities: [
    /total\s+(?:liabilities|debt)[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /(?:long[\-\s]term\s+)?debt[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)/gi
  ],
  currentAssets: [
    /current\s+assets[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi
  ],
  currentLiabilities: [
    /current\s+liabilities[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi
  ],
  cashFlow: [
    /(?:operating\s+)?cash\s*flow[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)\s*(?:million|m\b|billion|b\b)?/gi,
    /(?:free\s+)?cash\s*flow[:\s\-]*[\$€£¥]?\s*([\d,]+\.?\d*)/gi
  ],
  growth: [
    /(?:revenue\s+)?growth[:\s\-]*([\d,]+\.?\d*)%?/gi,
    /yoy[:\s\-]*([\d,]+\.?\d*)%?/gi,
    /year[\-\s]over[\-\s]year[:\s\-]*([\d,]+\.?\d*)%?/gi
  ]
};
console.log('📄 PDF Extraction Debug:');
console.log('  - Text length:', text.length);
console.log('  - First 200 chars:', text.substring(0, 200));


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

//new block
const extract = (patternList) => {
  for (const pattern of patternList) {
    const match = text.match(pattern);  // Use original text (not lowercased) for better number detection
    if (match) {
      return parseFinancialNumber(match[1]);  // Use our robust parser
    }
  }
  return null;
};
  // const extract = (patternList) => {
  //   for (const pattern of patternList) {
  //     const match = lowerText.match(pattern);
  //     if (match) {
  //       const value = parseFloat(match[1].replace(',', '.'));
  //       const unit = match[2]?.toLowerCase();
  //       return unit && (unit.includes('b') || unit.includes('billion')) ? value * 1000 : value;
  //     }
  //   }
  //   return null;
  // };

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

module.exports = {
  parseFinancialNumber,
  extractFinancialDataSmart,
  extractFromCSV,
  extractFromText,
  extractFromTableText
};
