// utils/aiAnalyzer.js
const ai = require('../config/gemini');
const { calculateMetrics, calculateDealSummary } = require('./metricsCalculator');

// NOTE: mockAIAnalysis is defined below in this file to preserve behavior if not provided externally.

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
    console.error("Signal explanation generation error:", error);
    return `This ${dealSummary.dealSignal.toLowerCase()} deal rating reflects ${dealSummary.valuationStatus.toLowerCase()} valuation at ${dealSummary.evToEbitda}x EV/EBITDA (sector avg: ${dealSummary.sectorAvgEV}x).`;
  }
};

// Mock AI analysis fallback
const mockAIAnalysisLocal = (financialData, fileName, sector) => {
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
      summary: analysis.summary || mockAIAnalysisLocal(financialData, fileName, sector).summary,
      risks: analysis.risks || mockAIAnalysisLocal(financialData, fileName, sector).risks,
      opportunities: analysis.opportunities || mockAIAnalysisLocal(financialData, fileName, sector).opportunities,
      metrics,
      dealSummary,
      signalExplanation: analysis.signalExplanation || `This ${dealSummary.dealSignal.toLowerCase()} deal rating reflects ${dealSummary.valuationStatus.toLowerCase()} valuation at ${dealSummary.evToEbitda}x EV/EBITDA (sector avg: ${dealSummary.sectorAvgEV}x) with ${metrics.debtToEbitda}x leverage. Health score of ${dealSummary.healthScore}/100 indicates ${dealSummary.healthStatus.toLowerCase().replace(/[🟢🟡🔴]/g, '').trim()} fundamentals.`
    };
    
  } catch (error) {
    console.error('Gemini API Error:', error.message);
    console.log('Falling back to mock analysis');
    return mockAIAnalysisLocal(financialData, fileName, sector);
  }
};

module.exports = { analyzeDealWithAI, generateDealSignalExplanation, mockAIAnalysis: mockAIAnalysisLocal };
