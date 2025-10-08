require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const benchmarks = require('../config/benchmarks');

// Calculate metrics and deal summary (from original server)
const calculateMetrics = (financialData) => {
  const revenue = Number(financialData.revenue);
  const ebitda = Number(financialData.ebitda);
  const net_income = Number(financialData.net_income);
  const total_assets = Number(financialData.total_assets);
  const total_liabilities = Number(financialData.total_liabilities);
  const current_assets = Number(financialData.current_assets);
  const current_liabilities = Number(financialData.current_liabilities);
  const cash_flow = Number(financialData.cash_flow);

  const profitMargin = (isFinite(net_income) && isFinite(revenue) && revenue !== 0) ? ((net_income / revenue) * 100).toFixed(1) : 'N/A';
  const debtRatio = (isFinite(total_liabilities) && isFinite(total_assets) && total_assets !== 0) ? (total_liabilities / total_assets).toFixed(2) : 'N/A';
  const currentRatio = (isFinite(current_assets) && isFinite(current_liabilities) && current_liabilities !== 0) ? (current_assets / current_liabilities).toFixed(2) : 'N/A';
  const evProxy = (isFinite(total_assets) && isFinite(total_liabilities) && isFinite(ebitda) && ebitda !== 0) ? (((total_assets + total_liabilities) / 2) / ebitda).toFixed(1) : 'N/A';
  const debtToEbitda = (isFinite(total_liabilities) && isFinite(ebitda) && ebitda !== 0) ? (total_liabilities / ebitda).toFixed(1) : 'N/A';
  const cashFlowValue = isFinite(cash_flow) ? Math.round(cash_flow * 10) / 10 : 'N/A';

  return {
    profitMargin,
    debtRatio,
    currentRatio,
    evToEbitda: evProxy,
    debtToEbitda,
    cashFlow: cashFlowValue,
    revenue: isFinite(revenue) ? revenue : null,
    ebitda: isFinite(ebitda) ? ebitda : null,
    revenueGrowth: financialData.revenueGrowth ?? null
  };
};

const calculateDealSummary = (financialData, sector = 'Multi-Sector') => {
  const sectorBenchmarks = benchmarks.sectorBenchmarks;
  const benchmark = sectorBenchmarks[sector] || sectorBenchmarks['Multi-Sector'];

  const { ebitda, total_assets, total_liabilities } = financialData;

  const evProxy = total_assets && total_liabilities && ebitda ? ((total_assets + total_liabilities) / 2) / ebitda : null;
  const debtToEbitda = total_liabilities && ebitda ? total_liabilities / ebitda : null;
  const impliedEV = total_assets && total_liabilities ? Math.round((total_assets + total_liabilities) / 2) : null;

  let valuationStatus = 'Fair Value';
  if (evProxy && benchmark.evToEbitda) {
    if (evProxy < benchmark.evToEbitda * 0.85) valuationStatus = 'Undervalued';
    else if (evProxy > benchmark.evToEbitda * 1.15) valuationStatus = 'Overvalued';
  }

  let dealSignal = 'Neutral';
  if (valuationStatus === 'Undervalued' && debtToEbitda && debtToEbitda < benchmark.debtToEbitda) dealSignal = 'Attractive';
  else if (valuationStatus === 'Overvalued' || (debtToEbitda && debtToEbitda > benchmark.debtToEbitda * 1.5)) dealSignal = 'Cautious';

  let healthScore = 50;
  if (evProxy && benchmark.evToEbitda) {
    const valuationRatio = evProxy / benchmark.evToEbitda;
    if (valuationRatio < 0.7) healthScore += 30;
    else if (valuationRatio < 0.85) healthScore += 25;
    else if (valuationRatio < 1.0) healthScore += 20;
    else if (valuationRatio < 1.15) healthScore += 10;
  } else {
    healthScore += 15;
  }

  if (debtToEbitda && benchmark.debtToEbitda) {
    const leverageRatio = debtToEbitda / benchmark.debtToEbitda;
    if (leverageRatio < 0.7) healthScore += 30;
    else if (leverageRatio < 0.9) healthScore += 25;
    else if (leverageRatio < 1.1) healthScore += 20;
    else if (leverageRatio < 1.3) healthScore += 10;
  } else {
    healthScore += 15;
  }

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
  let healthStatus = '🟢 Strong';
  if (healthScore < 60) healthStatus = '🔴 Weak';
  else if (healthScore < 75) healthStatus = '🟡 Moderate';

  let insight = 'Company shows balanced financial profile.';
  if (valuationStatus === 'Undervalued' && dealSignal === 'Attractive') insight = `Company trading below sector multiple; attractive leverage profile with ${evProxy?.toFixed(1)}x vs sector average ${benchmark.evToEbitda}x.`;
  else if (valuationStatus === 'Overvalued') insight = `Company trading above sector average; premium valuation may reflect growth expectations or sector positioning.`;
  else if (debtToEbitda && debtToEbitda > benchmark.debtToEbitda * 1.3) insight = `Elevated leverage levels require attention; debt-to-EBITDA of ${debtToEbitda.toFixed(1)}x exceeds sector norm.`;

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

const mockAIAnalysis = (financialData, fileName, sector) => {
  const companyName = fileName.replace(/[._-]/g, ' ').replace(/\.[^/.]+$/, "").trim();
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

const analyzeDealWithAI = async (fileContent, financialData, fileName, sector = 'Multi-Sector') => {
  try {
    const metrics = calculateMetrics(financialData);
    const dealSummary = calculateDealSummary(financialData, sector);
    const contentSnippet = typeof fileContent === 'string' ? fileContent.substring(0, 2000) : JSON.stringify(fileContent).substring(0, 2000);

    const prompt = `You are a private equity analyst. Analyze this financial deal document and provide insights.\n\nCompany: ${fileName}\nSector: ${sector}\n...`;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { candidateCount: 1 } });

    const rawText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(response);

    let analysis = null;
    try { analysis = JSON.parse(rawText); } catch (e) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { analysis = JSON.parse(jsonMatch[0]); } catch (e2) { analysis = null; }
      }
    }

    if (!analysis) {
      return mockAIAnalysis(financialData, fileName, sector);
    }

    return {
      summary: analysis.summary || mockAIAnalysis(financialData, fileName, sector).summary,
      risks: analysis.risks || mockAIAnalysis(financialData, fileName, sector).risks,
      opportunities: analysis.opportunities || mockAIAnalysis(financialData, fileName, sector).opportunities,
      metrics,
      dealSummary,
      signalExplanation: analysis.signalExplanation || `This ${dealSummary.dealSignal.toLowerCase()} deal rating reflects ${dealSummary.valuationStatus.toLowerCase()} valuation at ${dealSummary.evToEbitda}x EV/EBITDA.`
    };
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    return mockAIAnalysis(financialData, fileName, sector);
  }
};

const askDeal = async (deal, question) => {
  const context = `Deal: ${deal.companyName}\nSector: ${deal.industry}\nSummary: ${deal.summary}\n`;
  const prompt = `You are a private equity analyst assistant. Answer the following question about this deal concisely in 1-2 sentences.\n\n${context}\nUser Question: ${question}`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const answer = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate an answer.";
    return answer.trim();
  } catch (error) {
    console.error('Q&A error:', error.message);
    return `AI error: ${error.message}`;
  }
};

const compareDeals = async (dealA, dealB) => {
  try {
    const prompt = `You are a private equity analyst comparing two deals. Which is better? Deal A: ${dealA.companyName} (${dealA.dealSummary.dealSignal}). Deal B: ${dealB.companyName} (${dealB.dealSummary.dealSignal}).`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    return response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || 'AI could not generate comparison summary.';
  } catch (error) {
    console.error('Compare error:', error.message);
    return 'AI error when comparing deals.';
  }
};

module.exports = {
  analyzeDealWithAI,
  askDeal,
  compareDeals,
  calculateMetrics,
  calculateDealSummary,
  mockAIAnalysis
};
