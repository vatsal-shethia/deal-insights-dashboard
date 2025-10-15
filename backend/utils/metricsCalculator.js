// utils/metricsCalculator.js
const { sectorBenchmarks } = require('../data/storage');

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

// Calculate deal summary with health score
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

module.exports = { calculateMetrics, calculateDealSummary };
