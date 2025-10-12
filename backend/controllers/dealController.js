// controllers/dealController.js
const { parseCSV, parsePDF } = require('../utils/fileParser');
const {
  extractFinancialDataSmart
} = require('../utils/financialExtractor');
const {
  analyzeDealWithAI
} = require('../utils/aiAnalyzer');
const { calculateMetrics } = require('../utils/metricsCalculator');
const { dealsCache } = require('../data/storage');

// uploadDeals - handles POST /api/deals/upload
const uploadDeals = async (req, res) => {
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
};

// getAllDeals - handles GET /api/deals
const getAllDeals = (req, res) => {
  const deals = dealsCache.get('allDeals') || [];
  res.json(deals);
};

// getDeal - handles GET /api/deals/:dealId
const getDeal = (req, res) => {
  const deal = dealsCache.get(req.params.dealId);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json(deal);
};

// askQuestion - handles POST /api/deals/:dealId/ask
const askQuestion = async (req, res) => {
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

    const response = await require('../config/gemini').models.generateContent({
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
};

// compareDeals - handles POST /api/deals/compare
const compareDeals = async (req, res) => {
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

Explain which deal is more investible and why. End with the sentence: "Hence, [Company Name] is the better investment deal."
`;

    const response = await require('../config/gemini').models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ comparisonSummary: text?.trim() || 'AI could not generate comparison summary.' });
  } catch (error) {
    console.error('Compare summary error:', error.message);
    res.status(500).json({ error: 'Failed to generate comparison summary.' });
  }
};

module.exports = { uploadDeals, getAllDeals, getDeal, askQuestion, compareDeals };
