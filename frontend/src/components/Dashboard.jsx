import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useParams, Link, useLocation } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard() {
  const { dealId } = useParams();
  const location = useLocation();
  const [dealData, setDealData] = useState(null);
  const [loading, setLoading] = useState(true);
  const mainRef = useRef(null);

  const handleExportPdf = async () => {
    try {
      const element = mainRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const img = new Image();
      img.src = imgData;
      await new Promise(res => { img.onload = res; });

      const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
      const imgW = img.width * ratio;
      const imgH = img.height * ratio;
      const x = (pdfWidth - imgW) / 2;
      const y = (pdfHeight - imgH) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      pdf.save(`deal-${dealData?.id || 'report'}-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export PDF failed', err);
    }
  };

  useEffect(() => {
    const fetchDealData = async () => {
      try {
        // Check if we have deal data passed via navigation state
        if (location.state?.deal) {
          setDealData(location.state.deal);
          setLoading(false);
          return;
        }

        // Otherwise fetch from API
        if (dealId) {
          const response = await fetch(`/api/deals/${dealId}`);
          if (response.ok) {
            const data = await response.json();
            setDealData(data);
          } else {
            throw new Error('Deal not found');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching deal data:', error);
        setLoading(false);
      }
    };

    fetchDealData();
  }, [dealId, location.state]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
        <Navigation />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ color: '#666666', fontSize: '1.125rem' }}>Loading deal data...</p>
        </div>
      </div>
    );
  }

  if (!dealData) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
        <Navigation />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: '#666666', fontSize: '1.125rem' }}>Deal not found</p>
          <Link to="/" style={{ color: '#d4a574', textDecoration: 'underline' }}>Upload a new deal</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
      <Navigation />
      
  <main ref={mainRef} style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 3rem' }}>
        
        {/* Deal Overview Header */}
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5ddd5',
          borderRadius: '12px', 
          padding: '2rem 2.5rem', 
          marginBottom: '2.5rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              backgroundColor: '#f5f1ed',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.75rem' }}>📊</span>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                {dealData.companyName}
              </h1>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: '#999999' }}>
                <span>📋 {dealData.dealName}</span>
                <span>📅 {new Date(dealData.dateUploaded).toLocaleDateString()}</span>
                <span>🏢 {dealData.industry}</span>
              </div>
            </div>
            <button onClick={handleExportPdf} style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #e5ddd5',
              borderRadius: '6px',
              color: '#1a1a1a',
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer',
              letterSpacing: '0.02em'
            }}>
              EXPORT PDF
            </button>
          </div>
        </div>

        {/*new block*/}
        {/* Deal Summary Card */}
        {dealData.dealSummary && (
          <div style={{ 
            backgroundColor: 'white', 
            border: '2px solid #d4a574',
            borderRadius: '12px', 
            padding: '2rem 2.5rem', 
            marginBottom: '2.5rem',
            boxShadow: '0 4px 20px rgba(212, 165, 116, 0.15)'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '500', 
              color: '#1a1a1a', 
              marginBottom: '1.5rem',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              borderBottom: '1px solid #e5ddd5',
              paddingBottom: '0.75rem'
            }}>
              DEAL SUMMARY
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '0.8125rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Health Score
                </p>
                <p style={{ fontSize: '2rem', fontWeight: '300', color: '#1a1a1a' }}>
                  {dealData.dealSummary.healthScore}/100 <span style={{ fontSize: '1.25rem' }}>{dealData.dealSummary.healthStatus}</span>
                </p>
              </div>
              
              <div>
  <p style={{ fontSize: '0.8125rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
    Deal Signal
  </p>
  <p style={{ 
    fontSize: '2rem', 
    fontWeight: '300', 
    color: dealData.dealSummary.dealSignal === 'Attractive' ? '#2d5f3f' : 
          dealData.dealSummary.dealSignal === 'Cautious' ? '#c33' : '#1a1a1a',
    marginBottom: '0.75rem'
  }}>
    {dealData.dealSummary.dealSignal}
  </p>
  
  {/* Inline explanation - NEW */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'flex-start', 
    gap: '0.5rem',
    backgroundColor: '#fafafa',
    padding: '0.75rem',
    borderRadius: '6px',
    borderLeft: '2px solid ' + (dealData.dealSummary.dealSignal === 'Attractive' ? '#2d5f3f' : 
                                 dealData.dealSummary.dealSignal === 'Cautious' ? '#c33' : '#d4a574')
  }}>
    <span style={{ fontSize: '0.875rem', marginTop: '0.125rem' }}>🔍</span>
    <p style={{ fontSize: '0.8125rem', color: '#666666', lineHeight: '1.5', margin: 0 }}>
      {dealData.signalExplanation || dealData.dealSummary.insight}
    </p>
  </div>
</div>
              
              <div>
                <p style={{ fontSize: '0.8125rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Valuation
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a' }}>
                  {dealData.dealSummary.valuationStatus}
                </p>
              </div>
              
              <div>
                <p style={{ fontSize: '0.8125rem', color: '#999999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  EV / EBITDA
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: '300', color: '#1a1a1a' }}>
                  {dealData.dealSummary.evToEbitda}x 
                  <span style={{ fontSize: '0.875rem', color: '#999999', marginLeft: '0.5rem' }}>
                    (vs. Sector Avg: {dealData.dealSummary.sectorAvgEV}x)
                  </span>
                </p>
              </div>

            </div>
            
            <div style={{ 
              backgroundColor: '#f5f1ed', 
              padding: '1rem 1.25rem', 
              borderRadius: '8px',
              marginTop: '1rem'
            }}>
              <p style={{ fontSize: '0.8125rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Implied Valuation (EV)
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.75rem' }}>
                {dealData.dealSummary.impliedEV}
              </p>
              <p style={{ fontSize: '0.9375rem', color: '#666666', lineHeight: '1.6', fontStyle: 'italic' }}>
                {dealData.dealSummary.insight}
              </p>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem' }}>
          
          {/* LEFT COLUMN - Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Metrics Cards */}
            {/* new block */}
            <MetricCard icon="💰" label="Profit Margin" value={`${dealData.metrics.profitMargin}%`} />
            <MetricCard icon="📊" label="Debt Ratio" value={dealData.metrics.debtRatio} />
            <MetricCard icon="💵" label="Current Ratio" value={dealData.metrics.currentRatio} positive={parseFloat(dealData.metrics.currentRatio) > 1.5} />
            <MetricCard icon="📈" label="EV / EBITDA" value={`${dealData.metrics.evToEbitda}x`} />
            <MetricCard icon="⚡" label="Debt-to-EBITDA" value={`${dealData.metrics.debtToEbitda}x`} />
            <MetricCard icon="💸" label="Cash Flow" value={`$${dealData.metrics.cashFlow}M`} />
            {/* <MetricCard icon="💰" label="Revenue" value={`$${dealData.metrics.revenue}M`} />
            <MetricCard icon="📈" label="Revenue Growth" value={`+${dealData.metrics.revenueGrowth}%`} positive />
            <MetricCard icon="⚡" label="EBITDA" value={`$${dealData.metrics.ebitda}M`} />
            <MetricCard icon="📉" label="Debt" value={`$${dealData.metrics.debt}M`} />
            <MetricCard icon="💵" label="Cash Flow" value={`$${dealData.metrics.cashFlow}M`} />
            <MetricCard icon="📐" label="Valuation Multiple" value={`${dealData.metrics.valuation}x`} />
            <MetricCard icon="📊" label="Debt/Equity Ratio" value={dealData.metrics.debtRatio} />
            <MetricCard icon="🧾" label="Profit Margin" value={`${dealData.metrics.profitMargin}%`} /> */}
            
          </div>

          {/* RIGHT COLUMN - Insights & Charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* AI Summary */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5ddd5',
              borderRadius: '12px', 
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
                  Executive Summary
                </h2>
              </div>
              <p style={{ color: '#666666', lineHeight: '1.7', fontSize: '0.9375rem' }}>
                {dealData.summary}
              </p>
            </div>

            {/* Risks & Opportunities */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5ddd5',
              borderRadius: '12px', 
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
                  Risks & Opportunities
                </h2>
              </div>
              
              {/* Risks */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#c33', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Risks
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dealData.risks.map((risk, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#666666', lineHeight: '1.6' }}>
                      <span style={{ color: '#c33', fontSize: '1rem', marginTop: '0.125rem' }}>●</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities */}
              <div>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2d5f3f', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Opportunities
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dealData.opportunities.map((opp, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#666666', lineHeight: '1.6' }}>
                      <span style={{ color: '#2d5f3f', fontSize: '1rem', marginTop: '0.125rem' }}>●</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Revenue Trend Chart */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5ddd5',
              borderRadius: '12px', 
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
                Revenue Trend
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dealData.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd5" />
                  <XAxis dataKey="period" stroke="#999999" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="#999999" style={{ fontSize: '0.75rem' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5ddd5',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#d4a574" strokeWidth={2} dot={{ fill: '#d4a574', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* EBITDA Chart */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5ddd5',
              borderRadius: '12px', 
              padding: '2rem',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
                EBITDA & Margin
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dealData.ebitdaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd5" />
                  <XAxis dataKey="period" stroke="#999999" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="#999999" style={{ fontSize: '0.75rem' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5ddd5',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <Bar dataKey="ebitda" fill="#b88a5f" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, positive }) {
  return (
    <div style={{ 
      backgroundColor: 'white',
      border: '1px solid #e5ddd5',
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
      transition: 'transform 0.2s ease',
      cursor: 'default'
    }}>
      <div style={{ 
        width: '48px', 
        height: '48px', 
        backgroundColor: '#f5f1ed',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.8125rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>
          {label}
        </p>
        <p style={{ 
          fontSize: '1.5rem', 
          fontWeight: '300', 
          color: positive ? '#2d5f3f' : '#1a1a1a',
          letterSpacing: '-0.01em' 
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// Navigation Component
function Navigation() {
  return (
    <nav style={{ borderBottom: '1px solid #e5ddd5', backgroundColor: 'white' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', textDecoration: 'none', letterSpacing: '-0.01em' }}>
          Deal Insights
        </Link>
        <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.9375rem' }}>
          <Link to="/" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Upload</Link>
          <Link to="/dashboard" style={{ color: '#1a1a1a', fontWeight: '500', textDecoration: 'none', borderBottom: '2px solid #d4a574', paddingBottom: '0.25rem' }}>Dashboard</Link>
          <Link to="/compare" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Compare</Link>
          <Link to="/history" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>History</Link>
        </div>
      </div>
    </nav>
  );
}

export default Dashboard;