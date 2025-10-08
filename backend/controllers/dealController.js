const parseService = require('../services/parseService');
const aiService = require('../services/aiService');
const cache = require('../utils/cache');

const uploadDeals = async (req, res) => {
  try {
    const uploaded = req.files;
    if (!uploaded || uploaded.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const dealId = 'deal-' + Date.now();
    let fileContent = null;
    let financialData = {};

    const file = uploaded[0];
    try {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const csvData = await parseService.parseCSV(file.path);
        fileContent = csvData;
        financialData = parseService.extractFinancialDataSmart(csvData);
      } else if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        fileContent = await parseService.parsePDF(file.path);
        financialData = parseService.extractFinancialDataSmart(fileContent);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(400).json({ error: 'Failed to parse file. Please ensure it contains valid financial data.', details: parseError.message });
    }

    if (!financialData || !financialData.revenue) {
      return res.status(400).json({ error: 'Could not extract financial metrics from the file. Please ensure your CSV has columns like: Segment, Revenue, EBITDA, Debt, or your PDF contains clear financial data.' });
    }

    const sector = req.body.sector || 'Multi-Sector';

    const aiAnalysis = await aiService.analyzeDealWithAI(fileContent, financialData, uploaded[0].originalname, sector);

    const quarterlyBreakdown = [0.22, 0.24, 0.26, 0.28];
    const dealData = {
      id: dealId,
      companyName: aiAnalysis.summary.split(' ')[0] + ' Corp.',
      dealName: 'Financial Analysis Report',
      dateUploaded: new Date().toISOString(),
      industry: sector,
      files: uploaded.map(f => ({ filename: f.filename, originalname: f.originalname, size: f.size, mimetype: f.mimetype })),
      ...aiAnalysis,
      revenueData: quarterlyBreakdown.map((pct, i) => ({ period: `Q${i+1} 2024`, revenue: Math.round(financialData.revenue * pct) })),
      ebitdaData: quarterlyBreakdown.map((pct, i) => ({ period: `Q${i+1} 2024`, ebitda: Math.round(financialData.ebitda * pct), margin: (financialData.ebitda / financialData.revenue * 100).toFixed(1) }))
    };

    cache.storeDeal(dealId, dealData);

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

    cache.addToHistory(dealForHistory);

    res.status(200).json({ message: 'Files uploaded and analyzed successfully', dealId, deal: dealData });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
};

const getDealById = (req, res) => {
  const deal = cache.getDeal(req.params.dealId);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  res.json(deal);
};

const askDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { question } = req.body;
    if (!question || question.trim().length === 0) return res.status(400).json({ error: 'Question is required' });

    const deal = cache.getDeal(dealId);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const answer = await aiService.askDeal(deal, question);
    res.json({ question, answer, dealId });
  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({ error: 'Failed to process question: ' + error.message });
  }
};

const getAllDeals = (req, res) => {
  res.json(cache.getAllDeals());
};

const compareDeals = async (req, res) => {
  try {
    const { dealA, dealB } = req.body;
    if (!dealA || !dealB) return res.status(400).json({ error: 'Both deals are required for comparison' });
    const summary = await aiService.compareDeals(dealA, dealB);
    res.json({ comparisonSummary: summary });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: 'Failed to generate comparison summary.' });
  }
};

module.exports = {
  uploadDeals,
  getDealById,
  askDeal,
  getAllDeals,
  compareDeals
};
