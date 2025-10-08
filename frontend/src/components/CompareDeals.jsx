import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function CompareDeals() {
  const [dealA, setDealA] = useState(null);
  const [dealB, setDealB] = useState(null);
  const [uploadMode, setUploadMode] = useState('select');
  const [previousDeals, setPreviousDeals] = useState([]);
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDealA, setSelectedDealA] = useState('');
  const [selectedDealB, setSelectedDealB] = useState('');
  const [error, setError] = useState('');
  const mainRef = useRef(null);
  const [comparisonSummary, setComparisonSummary] = useState('');

  const fetchComparisonSummary = async (dealA, dealB) => {
    try {
      const response = await fetch('/api/deals/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealA, dealB })
      });
      const data = await response.json();
      setComparisonSummary(data.comparisonSummary);
    } catch (err) {
      console.error('Comparison summary error:', err);
    }
  };

  // Trigger AI summary once both deals are loaded
  useEffect(() => {
    if (dealA && dealB) fetchComparisonSummary(dealA, dealB);
  }, [dealA, dealB]);


  const handleExportPdf = async () => {
    try {
      setError('');
      const element = mainRef.current;
      if (!element) {
        setError('Nothing to export');
        return;
      }

      // use html2canvas to capture the element
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // A4 dimensions in pt (1pt = 1/72 inch). jsPDF uses 'pt' by default with 'portrait' orientation
      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit into PDF while preserving aspect ratio
      const img = new Image();
      img.src = imgData;
      await new Promise((res) => { img.onload = res; });

      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgRenderWidth = imgWidth * ratio;
      const imgRenderHeight = imgHeight * ratio;

      const x = (pdfWidth - imgRenderWidth) / 2;
      const y = (pdfHeight - imgRenderHeight) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, imgRenderWidth, imgRenderHeight);
      pdf.save(`deal-comparison-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export PDF error:', err);
      setError('Failed to export PDF');
    }
  };

  useEffect(() => {
    fetchPreviousDeals();
  }, []);

  const fetchPreviousDeals = async () => {
    try {
      const response = await fetch('/api/deals');
      if (response.ok) {
        const data = await response.json();
        setPreviousDeals(data);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      setError('Failed to load previous deals');
    }
  };

  const loadDealData = async (dealIdA, dealIdB) => {
    try {
      setLoading(true);
      setError('');

      const [responseA, responseB] = await Promise.all([
        fetch(`/api/deals/${dealIdA}`),
        fetch(`/api/deals/${dealIdB}`)
      ]);

      if (!responseA.ok || !responseB.ok) {
        throw new Error('Failed to fetch deal data');
      }

      const dealAData = await responseA.json();
      const dealBData = await responseB.json();

      setDealA(dealAData);
      setDealB(dealBData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!fileA || !fileB) {
      setError('Please select both files to compare');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formDataA = new FormData();
      formDataA.append('files', fileA);
      
      const responseA = await fetch('/api/deals/upload', {
        method: 'POST',
        body: formDataA,
      });

      if (!responseA.ok) {
        const errorData = await responseA.json();
        throw new Error(errorData.error || 'Failed to upload file A');
      }

      const dataA = await responseA.json();

      const formDataB = new FormData();
      formDataB.append('files', fileB);
      
      const responseB = await fetch('/api/deals/upload', {
        method: 'POST',
        body: formDataB,
      });

      if (!responseB.ok) {
        const errorData = await responseB.json();
        throw new Error(errorData.error || 'Failed to upload file B');
      }

      const dataB = await responseB.json();

      setDealA(dataA.deal);
      setDealB(dataB.deal);
      setLoading(false);
      
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setLoading(false);
    }
  };

  const handleDealSelection = () => {
    if (!selectedDealA || !selectedDealB) {
      setError('Please select both deals to compare');
      return;
    }

    if (selectedDealA === selectedDealB) {
      setError('Please select two different deals to compare');
      return;
    }

    loadDealData(selectedDealA, selectedDealB);
  };

  const compareMetric = (a, b, higherIsBetter = true) => {
    if (a === b) return 'neutral';
    if (higherIsBetter) {
      return a > b ? 'better' : 'worse';
    } else {
      return a < b ? 'better' : 'worse';
    }
  };

  const mergeChartData = () => {
    if (!dealA || !dealB) return [];
    
    const periods = dealA.revenueData.map(item => item.period);
    return periods.map(period => ({
      period,
      dealA: dealA.revenueData.find(item => item.period === period)?.revenue || 0,
      dealB: dealB.revenueData.find(item => item.period === period)?.revenue || 0
    }));
  };

  const resetComparison = () => {
    setDealA(null);
    setDealB(null);
    setSelectedDealA('');
    setSelectedDealB('');
    setFileA(null);
    setFileB(null);
    setError('');
  };

  if (!dealA || !dealB) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
        <Navigation />
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
            Compare Deals
          </h1>
          <p style={{ color: '#666666', marginBottom: '3rem' }}>
            Select or upload two deals to compare side-by-side
          </p>

          {error && (
            <div style={{ 
              marginBottom: '2rem',
              padding: '1rem',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c33'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button
              onClick={() => setUploadMode('select')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: uploadMode === 'select' ? '#1a1a1a' : 'white',
                color: uploadMode === 'select' ? 'white' : '#1a1a1a',
                border: '1px solid #e5ddd5',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Select from History
            </button>
            <button
              onClick={() => setUploadMode('upload')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: uploadMode === 'upload' ? '#1a1a1a' : 'white',
                color: uploadMode === 'upload' ? 'white' : '#1a1a1a',
                border: '1px solid #e5ddd5',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Upload New Files
            </button>
          </div>

          {uploadMode === 'select' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Deal A</h3>
                <select 
                  value={selectedDealA}
                  onChange={(e) => setSelectedDealA(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5ddd5' }}
                >
                  <option value="">Select a deal...</option>
                  {previousDeals.map(deal => (
                    <option key={deal.id} value={deal.id}>{deal.companyName} - {deal.dateUploaded}</option>
                  ))}
                </select>
                {selectedDealA && (
                  <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
                    Selected: {previousDeals.find(d => d.id === selectedDealA)?.companyName}
                  </p>
                )}
              </div>
              <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Deal B</h3>
                <select 
                  value={selectedDealB}
                  onChange={(e) => setSelectedDealB(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5ddd5' }}
                >
                  <option value="">Select a deal...</option>
                  {previousDeals.map(deal => (
                    <option key={deal.id} value={deal.id}>{deal.companyName} - {deal.dateUploaded}</option>
                  ))}
                </select>
                {selectedDealB && (
                  <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
                    Selected: {previousDeals.find(d => d.id === selectedDealB)?.companyName}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Upload Deal A</h3>
                <input 
                  type="file" 
                  accept=".csv,.pdf" 
                  onChange={(e) => setFileA(e.target.files[0])} 
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5ddd5', borderRadius: '6px' }}
                />
                {fileA && (
                  <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
                    Selected: {fileA.name}
                  </p>
                )}
                <p style={{ fontSize: '0.75rem', color: '#999999', marginTop: '0.5rem' }}>
                  Supported formats: CSV, PDF
                </p>
              </div>
              <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Upload Deal B</h3>
                <input 
                  type="file" 
                  accept=".csv,.pdf" 
                  onChange={(e) => setFileB(e.target.files[0])} 
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5ddd5', borderRadius: '6px' }}
                />
                {fileB && (
                  <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
                    Selected: {fileB.name}
                  </p>
                )}
                <p style={{ fontSize: '0.75rem', color: '#999999', marginTop: '0.5rem' }}>
                  Supported formats: CSV, PDF
                </p>
              </div>
            </div>
          )}

          <button
            onClick={uploadMode === 'select' ? handleDealSelection : handleFileUpload}
            disabled={loading}
            style={{
              marginTop: '2rem',
              padding: '0.875rem 2.5rem',
              backgroundColor: loading ? '#999999' : '#1a1a1a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              letterSpacing: '0.02em',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'PROCESSING...' : 'COMPARE DEALS'}
          </button>

          {loading && (
            <div style={{ marginTop: '1rem', color: '#666666' }}>
              Analyzing deal documents... This may take a few moments.
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
      <Navigation />
      
      <main ref={mainRef} style={{ maxWidth: '1600px', margin: '0 auto', padding: '2.5rem 3rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
            Deal Comparison
          </h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={resetComparison}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: 'white',
                border: '1px solid #e5ddd5',
                borderRadius: '6px',
                color: '#1a1a1a',
                fontSize: '0.8125rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              CHANGE DEALS
            </button>
            <button onClick={handleExportPdf} style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #e5ddd5',
              borderRadius: '6px',
              color: '#1a1a1a',
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}>
              EXPORT PDF
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <DealHeader deal={dealA} label="Deal A" />
          <DealHeader deal={dealB} label="Deal B" />
        </div>

        {/*new block*/}
        {/* AI Investment Comparison Summary */}
          {comparisonSummary && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5ddd5',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2.5rem',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1rem' }}>
                Investment Summary
              </h2>
              <p style={{ color: '#444', lineHeight: '1.7' }}>{comparisonSummary}</p>
            </div>
          )}


        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5ddd5',
          borderRadius: '12px', 
          padding: '2rem',
          marginBottom: '2.5rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem' }}>
            Key Metrics Comparison
          </h2>
          
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <MetricRow 
              icon="💰" 
              label="Revenue" 
              valueA={`$${dealA.metrics.revenue}M`}
              valueB={`$${dealB.metrics.revenue}M`}
              statusA={compareMetric(dealA.metrics.revenue, dealB.metrics.revenue)}
              statusB={compareMetric(dealB.metrics.revenue, dealA.metrics.revenue)}
            />
            <MetricRow 
              icon="📈" 
              label="Revenue Growth" 
              valueA={`+${dealA.metrics.revenueGrowth}%`}
              valueB={`+${dealB.metrics.revenueGrowth}%`}
              statusA={compareMetric(dealA.metrics.revenueGrowth, dealB.metrics.revenueGrowth)}
              statusB={compareMetric(dealB.metrics.revenueGrowth, dealA.metrics.revenueGrowth)}
            />
            <MetricRow 
              icon="⚡" 
              label="EBITDA" 
              valueA={`$${dealA.metrics.ebitda}M`}
              valueB={`$${dealB.metrics.ebitda}M`}
              statusA={compareMetric(dealA.metrics.ebitda, dealB.metrics.ebitda)}
              statusB={compareMetric(dealB.metrics.ebitda, dealA.metrics.ebitda)}
            />
            <MetricRow 
              icon="📉" 
              label="Debt" 
              valueA={`$${dealA.metrics.debt}M`}
              valueB={`$${dealB.metrics.debt}M`}
              statusA={compareMetric(dealA.metrics.debt, dealB.metrics.debt, false)}
              statusB={compareMetric(dealB.metrics.debt, dealA.metrics.debt, false)}
            />
            <MetricRow 
              icon="💵" 
              label="Cash Flow" 
              valueA={`$${dealA.metrics.cashFlow}M`}
              valueB={`$${dealB.metrics.cashFlow}M`}
              statusA={compareMetric(dealA.metrics.cashFlow, dealB.metrics.cashFlow)}
              statusB={compareMetric(dealB.metrics.cashFlow, dealA.metrics.cashFlow)}
            />
            <MetricRow 
              icon="📊" 
              label="Valuation Multiple" 
              valueA={`${dealA.metrics.valuation}x`}
              valueB={`${dealB.metrics.valuation}x`}
              statusA={compareMetric(dealA.metrics.valuation, dealB.metrics.valuation)}
              statusB={compareMetric(dealB.metrics.valuation, dealA.metrics.valuation)}
            />
            <MetricRow 
              icon="📏" 
              label="Debt/Equity Ratio" 
              valueA={dealA.metrics.debtRatio}
              valueB={dealB.metrics.debtRatio}
              statusA={compareMetric(parseFloat(dealA.metrics.debtRatio), parseFloat(dealB.metrics.debtRatio), false)}
              statusB={compareMetric(parseFloat(dealB.metrics.debtRatio), parseFloat(dealA.metrics.debtRatio), false)}
            />
            <MetricRow 
              icon="🧾" 
              label="Profit Margin" 
              valueA={`${dealA.metrics.profitMargin}%`}
              valueB={`${dealB.metrics.profitMargin}%`}
              statusA={compareMetric(parseFloat(dealA.metrics.profitMargin), parseFloat(dealB.metrics.profitMargin))}
              statusB={compareMetric(parseFloat(dealB.metrics.profitMargin), parseFloat(dealA.metrics.profitMargin))}
            />
          </div>
        </div>

        {/* <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <SummaryCard title="Deal A Summary" summary={dealA.summary} />
          <SummaryCard title="Deal B Summary" summary={dealB.summary} />
        </div> */}

        {/* <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5ddd5',
          borderRadius: '12px', 
          padding: '2rem',
          marginBottom: '2.5rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem' }}>
            Risks & Opportunities
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#c33', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Risks - Deal A
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dealA.risks.map((risk, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
                    <span style={{ color: '#c33' }}>●</span>
                    {risk}
                  </li>
                ))}
              </ul>
              
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2d5f3f', marginTop: '1.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Opportunities - Deal A
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dealA.opportunities.map((opp, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
                    <span style={{ color: '#2d5f3f' }}>●</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#c33', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Risks - Deal B
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dealB.risks.map((risk, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
                    <span style={{ color: '#c33' }}>●</span>
                    {risk}
                  </li>
                ))}
              </ul>
              
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2d5f3f', marginTop: '1.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Opportunities - Deal B
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dealB.opportunities.map((opp, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
                    <span style={{ color: '#2d5f3f' }}>●</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div> */}

        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5ddd5',
          borderRadius: '12px', 
          padding: '2rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem' }}>
            Revenue Trend Comparison
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mergeChartData()}>
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
              <Legend />
              <Line type="monotone" dataKey="dealA" stroke="#d4a574" strokeWidth={2} name="Deal A" dot={{ fill: '#d4a574', r: 4 }} />
              <Line type="monotone" dataKey="dealB" stroke="#b88a5f" strokeWidth={2} name="Deal B" dot={{ fill: '#b88a5f', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </main>
    </div>
  );
}

function DealHeader({ deal, label }) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      border: '1px solid #e5ddd5',
      borderRadius: '12px', 
      padding: '2rem',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          backgroundColor: '#f5f1ed',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem'
        }}>
          📊
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
          </p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
            {deal.companyName}
          </h2>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#666666' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📋</span>
          <span>{deal.dealName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📅</span>
          <span>{new Date(deal.dateUploaded).toLocaleDateString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🏢</span>
          <span>{deal.industry}</span>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ icon, label, valueA, valueB, statusA, statusB }) {
  const getColor = (status) => {
    if (status === 'better') return '#2d5f3f';
    if (status === 'worse') return '#c33';
    return '#1a1a1a';
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '200px 1fr 1fr', 
      gap: '2rem',
      padding: '1rem',
      backgroundColor: '#faf8f6',
      borderRadius: '8px',
      alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#666666' }}>{label}</span>
      </div>
      <div style={{ 
        fontSize: '1.125rem', 
        fontWeight: '400', 
        color: getColor(statusA),
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {valueA}
        {statusA === 'better' && <span style={{ fontSize: '0.875rem' }}>✓</span>}
      </div>
      <div style={{ 
        fontSize: '1.125rem', 
        fontWeight: '400', 
        color: getColor(statusB),
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {valueB}
        {statusB === 'better' && <span style={{ fontSize: '0.875rem' }}>✓</span>}
      </div>
    </div>
  );
}

function SummaryCard({ title, summary }) {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      border: '1px solid #e5ddd5',
      borderRadius: '12px', 
      padding: '2rem',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
    }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1rem' }}>
        {title}
      </h3>
      <p style={{ color: '#666666', lineHeight: '1.7', fontSize: '0.875rem' }}>
        {summary}
      </p>
    </div>
  );
}

function Navigation() {
  return (
    <nav style={{ borderBottom: '1px solid #e5ddd5', backgroundColor: 'white' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', textDecoration: 'none', letterSpacing: '-0.01em' }}>
          Deal Insights
        </Link>
        <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.9375rem' }}>
          <Link to="/" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Upload</Link>
          <Link to="/dashboard" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Dashboard</Link>
          <Link to="/compare" style={{ color: '#1a1a1a', fontWeight: '500', textDecoration: 'none', borderBottom: '2px solid #d4a574', paddingBottom: '0.25rem' }}>Compare</Link>
          <Link to="/history" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>History</Link>
        </div>
      </div>
    </nav>
  );
}

export default CompareDeals;

// import { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// function CompareDeals() {
//   const [dealA, setDealA] = useState(null);
//   const [dealB, setDealB] = useState(null);
//   const [uploadMode, setUploadMode] = useState('select'); // 'select' or 'upload'
//   const [previousDeals, setPreviousDeals] = useState([]);
//   const [fileA, setFileA] = useState(null);
//   const [fileB, setFileB] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [selectedDealA, setSelectedDealA] = useState('');
//   const [selectedDealB, setSelectedDealB] = useState('');

//   useEffect(() => {
//     // Fetch previous deals for selection
//     fetchPreviousDeals();
//   }, []);

//   const fetchPreviousDeals = async () => {
//     // Mock previous deals - in real app, this would be an API call
//     setPreviousDeals([
//       { id: '1', name: 'Tech Innovations Inc.', date: '2025-03-15' },
//       { id: '2', name: 'Global Health Corp.', date: '2025-03-10' },
//       { id: '3', name: 'Finance Solutions Ltd.', date: '2025-03-05' },
//       { id: '4', name: 'Retail Growth Partners', date: '2025-02-28' },
//       { id: '5', name: 'Manufacturing Excellence Co.', date: '2025-02-20' }
//     ]);
//   };

//   const loadMockData = (dealIdA, dealIdB) => {
//     // Mock deal data
//     const mockDeals = {
//       '1': {
//         id: '1',
//         companyName: 'Tech Innovations Inc.',
//         dealName: 'Series B Acquisition',
//         dateUploaded: 'March 15, 2025',
//         industry: 'Technology',
//         metrics: {
//           revenue: 125,
//           revenueGrowth: 15,
//           ebitda: 25,
//           debt: 40,
//           cashFlow: 12,
//           valuation: 12,
//           debtRatio: 0.65,
//           profitMargin: 18
//         },
//         summary: 'Tech Innovations Inc. shows strong YoY growth of 15%, driven by expanding operations in APAC and North America. Healthy EBITDA margin of 20%, though debt levels remain slightly elevated compared to industry averages.',
//         risks: [
//           'High leverage ratio compared to industry peers',
//           'Declining cash flow in past 2 quarters',
//           'Dependency on key customer accounts'
//         ],
//         opportunities: [
//           'Strong growth potential in APAC markets',
//           'Increasing recurring revenue stream (+22% YoY)',
//           'Recent product launch showing early traction'
//         ],
//         revenueData: [
//           { period: 'Q1', dealA: 28 },
//           { period: 'Q2', dealA: 30 },
//           { period: 'Q3', dealA: 32 },
//           { period: 'Q4', dealA: 35 }
//         ]
//       },
//       '2': {
//         id: '2',
//         companyName: 'Global Health Corp.',
//         dealName: 'Market Expansion Deal',
//         dateUploaded: 'March 10, 2025',
//         industry: 'Healthcare',
//         metrics: {
//           revenue: 98,
//           revenueGrowth: 7,
//           ebitda: 15,
//           debt: 50,
//           cashFlow: 8,
//           valuation: 9,
//           debtRatio: 0.85,
//           profitMargin: 12
//         },
//         summary: 'Global Health Corp. demonstrates moderate growth with a focus on market consolidation. Lower debt levels and strong operational efficiency, but facing competitive pressure in core markets. Recent cost optimization initiatives showing positive results.',
//         risks: [
//           'Weak profit margins compared to competitors',
//           'Market saturation in primary segments',
//           'High debt-to-equity ratio limiting flexibility'
//         ],
//         opportunities: [
//           'M&A pipeline for strategic acquisitions',
//           'Cost cutting initiatives underway',
//           'Lean operational structure'
//         ],
//         revenueData: [
//           { period: 'Q1', dealB: 23 },
//           { period: 'Q2', dealB: 24 },
//           { period: 'Q3', dealB: 25 },
//           { period: 'Q4', dealB: 26 }
//         ]
//       },
//       '3': {
//         id: '3',
//         companyName: 'Finance Solutions Ltd.',
//         dealName: 'Private Equity Buyout',
//         dateUploaded: 'March 5, 2025',
//         industry: 'Financial Services',
//         metrics: {
//           revenue: 156,
//           revenueGrowth: 22,
//           ebitda: 42,
//           debt: 65,
//           cashFlow: 28,
//           valuation: 14,
//           debtRatio: 0.45,
//           profitMargin: 26
//         },
//         summary: 'Finance Solutions Ltd. exhibits exceptional growth in the fintech sector with 22% YoY revenue increase. Strong EBITDA margins and healthy cash flow generation. Well-positioned for continued expansion in emerging markets.',
//         risks: [
//           'Regulatory changes in key markets',
//           'Cybersecurity threats in financial infrastructure',
//           'Competition from established banking institutions'
//         ],
//         opportunities: [
//           'Digital transformation initiatives gaining traction',
//           'Partnership opportunities with major banks',
//           'Expansion into underserved markets'
//         ],
//         revenueData: [
//           { period: 'Q1', dealB: 35 },
//           { period: 'Q2', dealB: 38 },
//           { period: 'Q3', dealB: 42 },
//           { period: 'Q4', dealB: 41 }
//         ]
//       }
//     };

//     // Set selected deals or use defaults
//     const dealAData = mockDeals[dealIdA] || mockDeals['1'];
//     const dealBData = mockDeals[dealIdB] || mockDeals['2'];

//     setDealA(dealAData);
//     setDealB(dealBData);
//   };

//   const handleFileUpload = async () => {
//     if (!fileA || !fileB) {
//       alert('Please select both files to compare');
//       return;
//     }

//     setLoading(true);
    
//     try {
//       // Simulate file upload and processing
//       await new Promise(resolve => setTimeout(resolve, 2000));
      
//       // In a real application, you would:
//       // 1. Upload files to your backend
//       // 2. Process the files to extract deal data
//       // 3. Set the deal states with the processed data
      
//       // For now, we'll load mock data
//       loadMockData();
      
//       alert('Files uploaded and processed successfully!');
//     } catch (error) {
//       alert('Error uploading files. Please try again.');
//       console.error('File upload error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDealSelection = () => {
//     if (!selectedDealA || !selectedDealB) {
//       alert('Please select both deals to compare');
//       return;
//     }

//     if (selectedDealA === selectedDealB) {
//       alert('Please select two different deals to compare');
//       return;
//     }

//     loadMockData(selectedDealA, selectedDealB);
//   };

//   const compareMetric = (a, b, higherIsBetter = true) => {
//     if (a === b) return 'neutral';
//     if (higherIsBetter) {
//       return a > b ? 'better' : 'worse';
//     } else {
//       return a < b ? 'better' : 'worse';
//     }
//   };

//   const getMetricColor = (status) => {
//     if (status === 'better') return '#2d5f3f';
//     if (status === 'worse') return '#c33';
//     return '#666666';
//   };

//   const mergeChartData = () => {
//     if (!dealA || !dealB) return [];
    
//     // Ensure both deals have revenue data for the same periods
//     const periods = dealA.revenueData.map(item => item.period);
//     return periods.map(period => ({
//       period,
//       dealA: dealA.revenueData.find(item => item.period === period)?.dealA || 0,
//       dealB: dealB.revenueData.find(item => item.period === period)?.dealB || 0
//     }));
//   };

//   const resetComparison = () => {
//     setDealA(null);
//     setDealB(null);
//     setSelectedDealA('');
//     setSelectedDealB('');
//     setFileA(null);
//     setFileB(null);
//   };

//   if (!dealA || !dealB) {
//     return (
//       <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
//         <Navigation />
//         <main style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
//           <h1 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem' }}>
//             Compare Deals
//           </h1>
//           <p style={{ color: '#666666', marginBottom: '3rem' }}>
//             Select or upload two deals to compare side-by-side
//           </p>

//           {/* Mode Toggle */}
//           <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
//             <button
//               onClick={() => setUploadMode('select')}
//               style={{
//                 padding: '0.75rem 1.5rem',
//                 backgroundColor: uploadMode === 'select' ? '#1a1a1a' : 'white',
//                 color: uploadMode === 'select' ? 'white' : '#1a1a1a',
//                 border: '1px solid #e5ddd5',
//                 borderRadius: '6px',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s ease'
//               }}
//             >
//               Select from History
//             </button>
//             <button
//               onClick={() => setUploadMode('upload')}
//               style={{
//                 padding: '0.75rem 1.5rem',
//                 backgroundColor: uploadMode === 'upload' ? '#1a1a1a' : 'white',
//                 color: uploadMode === 'upload' ? 'white' : '#1a1a1a',
//                 border: '1px solid #e5ddd5',
//                 borderRadius: '6px',
//                 cursor: 'pointer',
//                 transition: 'all 0.2s ease'
//               }}
//             >
//               Upload New Files
//             </button>
//           </div>

//           {uploadMode === 'select' ? (
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
//               <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
//                 <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Deal A</h3>
//                 <select 
//                   value={selectedDealA}
//                   onChange={(e) => setSelectedDealA(e.target.value)}
//                   style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5ddd5' }}
//                 >
//                   <option value="">Select a deal...</option>
//                   {previousDeals.map(deal => (
//                     <option key={deal.id} value={deal.id}>{deal.name} - {deal.date}</option>
//                   ))}
//                 </select>
//                 {selectedDealA && (
//                   <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
//                     Selected: {previousDeals.find(d => d.id === selectedDealA)?.name}
//                   </p>
//                 )}
//               </div>
//               <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
//                 <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Deal B</h3>
//                 <select 
//                   value={selectedDealB}
//                   onChange={(e) => setSelectedDealB(e.target.value)}
//                   style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e5ddd5' }}
//                 >
//                   <option value="">Select a deal...</option>
//                   {previousDeals.map(deal => (
//                     <option key={deal.id} value={deal.id}>{deal.name} - {deal.date}</option>
//                   ))}
//                 </select>
//                 {selectedDealB && (
//                   <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
//                     Selected: {previousDeals.find(d => d.id === selectedDealB)?.name}
//                   </p>
//                 )}
//               </div>
//             </div>
//           ) : (
//             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
//               <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
//                 <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Upload Deal A</h3>
//                 <input 
//                   type="file" 
//                   accept=".csv,.pdf,.xlsx,.xls" 
//                   onChange={(e) => setFileA(e.target.files[0])} 
//                   style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5ddd5', borderRadius: '6px' }}
//                 />
//                 {fileA && (
//                   <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
//                     Selected: {fileA.name}
//                   </p>
//                 )}
//                 <p style={{ fontSize: '0.75rem', color: '#999999', marginTop: '0.5rem' }}>
//                   Supported formats: CSV, PDF, Excel
//                 </p>
//               </div>
//               <div style={{ backgroundColor: 'white', border: '1px solid #e5ddd5', borderRadius: '12px', padding: '2rem' }}>
//                 <h3 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>Upload Deal B</h3>
//                 <input 
//                   type="file" 
//                   accept=".csv,.pdf,.xlsx,.xls" 
//                   onChange={(e) => setFileB(e.target.files[0])} 
//                   style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5ddd5', borderRadius: '6px' }}
//                 />
//                 {fileB && (
//                   <p style={{ fontSize: '0.875rem', color: '#666666', marginTop: '0.5rem' }}>
//                     Selected: {fileB.name}
//                   </p>
//                 )}
//                 <p style={{ fontSize: '0.75rem', color: '#999999', marginTop: '0.5rem' }}>
//                   Supported formats: CSV, PDF, Excel
//                 </p>
//               </div>
//             </div>
//           )}

//           <button
//             onClick={uploadMode === 'select' ? handleDealSelection : handleFileUpload}
//             disabled={loading}
//             style={{
//               marginTop: '2rem',
//               padding: '0.875rem 2.5rem',
//               backgroundColor: loading ? '#999999' : '#1a1a1a',
//               color: 'white',
//               border: 'none',
//               borderRadius: '6px',
//               cursor: loading ? 'not-allowed' : 'pointer',
//               fontSize: '0.875rem',
//               fontWeight: '500',
//               letterSpacing: '0.02em',
//               transition: 'all 0.2s ease'
//             }}
//           >
//             {loading ? 'PROCESSING...' : 'COMPARE DEALS'}
//           </button>

//           {loading && (
//             <div style={{ marginTop: '1rem', color: '#666666' }}>
//               Analyzing deal documents... This may take a few moments.
//             </div>
//           )}
//         </main>
//       </div>
//     );
//   }

//   // The rest of the component remains the same as in your original code
//   // ... (return statement with comparison view)
//   return (
//     <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
//       <Navigation />
      
//       <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2.5rem 3rem' }}>
        
//         {/* Header */}
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
//           <h1 style={{ fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
//             Deal Comparison
//           </h1>
//           <div style={{ display: 'flex', gap: '1rem' }}>
//             <button
//               onClick={resetComparison}
//               style={{
//                 padding: '0.625rem 1.5rem',
//                 backgroundColor: 'white',
//                 border: '1px solid #e5ddd5',
//                 borderRadius: '6px',
//                 color: '#1a1a1a',
//                 fontSize: '0.8125rem',
//                 fontWeight: '500',
//                 cursor: 'pointer'
//               }}
//             >
//               CHANGE DEALS
//             </button>
//             <button style={{
//               padding: '0.625rem 1.5rem',
//               backgroundColor: 'transparent',
//               border: '1px solid #e5ddd5',
//               borderRadius: '6px',
//               color: '#1a1a1a',
//               fontSize: '0.8125rem',
//               fontWeight: '500',
//               cursor: 'pointer'
//             }}>
//               EXPORT PDF
//             </button>
//           </div>
//         </div>

//         {/* Deal Headers - Side by Side */}
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
//           <DealHeader deal={dealA} label="Deal A" />
//           <DealHeader deal={dealB} label="Deal B" />
//         </div>

//         {/* Metrics Comparison Table */}
//         <div style={{ 
//           backgroundColor: 'white', 
//           border: '1px solid #e5ddd5',
//           borderRadius: '12px', 
//           padding: '2rem',
//           marginBottom: '2.5rem',
//           boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
//         }}>
//           <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem' }}>
//             Key Metrics Comparison
//           </h2>
          
//           <div style={{ display: 'grid', gap: '0.75rem' }}>
//             <MetricRow 
//               icon="💰" 
//               label="Revenue" 
//               valueA={`$${dealA.metrics.revenue}M`}
//               valueB={`$${dealB.metrics.revenue}M`}
//               statusA={compareMetric(dealA.metrics.revenue, dealB.metrics.revenue)}
//               statusB={compareMetric(dealB.metrics.revenue, dealA.metrics.revenue)}
//             />
//             <MetricRow 
//               icon="📈" 
//               label="Revenue Growth" 
//               valueA={`+${dealA.metrics.revenueGrowth}%`}
//               valueB={`+${dealB.metrics.revenueGrowth}%`}
//               statusA={compareMetric(dealA.metrics.revenueGrowth, dealB.metrics.revenueGrowth)}
//               statusB={compareMetric(dealB.metrics.revenueGrowth, dealA.metrics.revenueGrowth)}
//             />
//             <MetricRow 
//               icon="⚡" 
//               label="EBITDA" 
//               valueA={`$${dealA.metrics.ebitda}M`}
//               valueB={`$${dealB.metrics.ebitda}M`}
//               statusA={compareMetric(dealA.metrics.ebitda, dealB.metrics.ebitda)}
//               statusB={compareMetric(dealB.metrics.ebitda, dealA.metrics.ebitda)}
//             />
//             <MetricRow 
//               icon="📉" 
//               label="Debt" 
//               valueA={`$${dealA.metrics.debt}M`}
//               valueB={`$${dealB.metrics.debt}M`}
//               statusA={compareMetric(dealA.metrics.debt, dealB.metrics.debt, false)}
//               statusB={compareMetric(dealB.metrics.debt, dealA.metrics.debt, false)}
//             />
//             <MetricRow 
//               icon="💵" 
//               label="Cash Flow" 
//               valueA={`$${dealA.metrics.cashFlow}M`}
//               valueB={`$${dealB.metrics.cashFlow}M`}
//               statusA={compareMetric(dealA.metrics.cashFlow, dealB.metrics.cashFlow)}
//               statusB={compareMetric(dealB.metrics.cashFlow, dealA.metrics.cashFlow)}
//             />
//             <MetricRow 
//               icon="📐" 
//               label="Valuation Multiple" 
//               valueA={`${dealA.metrics.valuation}x`}
//               valueB={`${dealB.metrics.valuation}x`}
//               statusA={compareMetric(dealA.metrics.valuation, dealB.metrics.valuation)}
//               statusB={compareMetric(dealB.metrics.valuation, dealA.metrics.valuation)}
//             />
//             <MetricRow 
//               icon="🔁" 
//               label="Debt/Equity Ratio" 
//               valueA={dealA.metrics.debtRatio}
//               valueB={dealB.metrics.debtRatio}
//               statusA={compareMetric(dealA.metrics.debtRatio, dealB.metrics.debtRatio, false)}
//               statusB={compareMetric(dealB.metrics.debtRatio, dealA.metrics.debtRatio, false)}
//             />
//             <MetricRow 
//               icon="🧾" 
//               label="Profit Margin" 
//               valueA={`${dealA.metrics.profitMargin}%`}
//               valueB={`${dealB.metrics.profitMargin}%`}
//               statusA={compareMetric(dealA.metrics.profitMargin, dealB.metrics.profitMargin)}
//               statusB={compareMetric(dealB.metrics.profitMargin, dealA.metrics.profitMargin)}
//             />
//           </div>
//         </div>

//         {/* AI Summaries - Side by Side */}
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
//           <SummaryCard title="Deal A Summary" summary={dealA.summary} />
//           <SummaryCard title="Deal B Summary" summary={dealB.summary} />
//         </div>

//         {/* Risks & Opportunities Comparison */}
//         <div style={{ 
//           backgroundColor: 'white', 
//           border: '1px solid #e5ddd5',
//           borderRadius: '12px', 
//           padding: '2rem',
//           marginBottom: '2.5rem',
//           boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
//         }}>
//           <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem' }}>
//             Risks & Opportunities
//           </h2>
          
//           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
//             <div>
//               <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#c33', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//                 Risks - Deal A
//               </h3>
//               <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
//                 {dealA.risks.map((risk, idx) => (
//                   <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
//                     <span style={{ color: '#c33' }}>●</span>
//                     {risk}
//                   </li>
//                 ))}
//               </ul>
              
//               <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2d5f3f', marginTop: '1.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//                 Opportunities - Deal A
//               </h3>
//               <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
//                 {dealA.opportunities.map((opp, idx) => (
//                   <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
//                     <span style={{ color: '#2d5f3f' }}>●</span>
//                     {opp}
//                   </li>
//                 ))}
//               </ul>
//             </div>

//             <div>
//               <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#c33', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//                 Risks - Deal B
//               </h3>
//               <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
//                 {dealB.risks.map((risk, idx) => (
//                   <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
//                     <span style={{ color: '#c33' }}>●</span>
//                     {risk}
//                   </li>
//                 ))}
//               </ul>
              
//               <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2d5f3f', marginTop: '1.5rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//                 Opportunities - Deal B
//               </h3>
//               <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
//                 {dealB.opportunities.map((opp, idx) => (
//                   <li key={idx} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#666666' }}>
//                     <span style={{ color: '#2d5f3f' }}>●</span>
//                     {opp}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           </div>
//         </div>

//         {/* Revenue Comparison Chart */}
//         <div style={{ 
//           backgroundColor: 'white', 
//           border: '1px solid #e5ddd5',
//           borderRadius: '12px', 
//           padding: '2rem',
//           boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
//         }}>
//           <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1.5rem' }}>
//             Revenue Trend Comparison
//           </h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={mergeChartData()}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#e5ddd5" />
//               <XAxis dataKey="period" stroke="#999999" style={{ fontSize: '0.75rem' }} />
//               <YAxis stroke="#999999" style={{ fontSize: '0.75rem' }} />
//               <Tooltip 
//                 contentStyle={{ 
//                   backgroundColor: 'white', 
//                   border: '1px solid #e5ddd5',
//                   borderRadius: '6px',
//                   fontSize: '0.875rem'
//                 }}
//               />
//               <Legend />
//               <Line type="monotone" dataKey="dealA" stroke="#d4a574" strokeWidth={2} name="Deal A" dot={{ fill: '#d4a574', r: 4 }} />
//               <Line type="monotone" dataKey="dealB" stroke="#b88a5f" strokeWidth={2} name="Deal B" dot={{ fill: '#b88a5f', r: 4 }} />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//       </main>
//     </div>
//   );
// }

// // Deal Header Component
// function DealHeader({ deal, label }) {
//   return (
//     <div style={{ 
//       backgroundColor: 'white', 
//       border: '1px solid #e5ddd5',
//       borderRadius: '12px', 
//       padding: '2rem',
//       boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
//     }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
//         <div style={{ 
//           width: '50px', 
//           height: '50px', 
//           backgroundColor: '#f5f1ed',
//           borderRadius: '10px',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           fontSize: '1.5rem'
//         }}>
//           📊
//         </div>
//         <div>
//           <p style={{ fontSize: '0.75rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
//             {label}
//           </p>
//           <h2 style={{ fontSize: '1.25rem', fontWeight: '500', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
//             {deal.companyName}
//           </h2>
//         </div>
//       </div>
//       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem', color: '#666666' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//           <span>📋</span>
//           <span>{deal.dealName}</span>
//         </div>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//           <span>📅</span>
//           <span>{deal.dateUploaded}</span>
//         </div>
//         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//           <span>🏢</span>
//           <span>{deal.industry}</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Metric Row Component
// function MetricRow({ icon, label, valueA, valueB, statusA, statusB }) {
//   const getColor = (status) => {
//     if (status === 'better') return '#2d5f3f';
//     if (status === 'worse') return '#c33';
//     return '#1a1a1a';
//   };

//   return (
//     <div style={{ 
//       display: 'grid', 
//       gridTemplateColumns: '200px 1fr 1fr', 
//       gap: '2rem',
//       padding: '1rem',
//       backgroundColor: '#faf8f6',
//       borderRadius: '8px',
//       alignItems: 'center'
//     }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//         <span style={{ fontSize: '1.25rem' }}>{icon}</span>
//         <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#666666' }}>{label}</span>
//       </div>
//       <div style={{ 
//         fontSize: '1.125rem', 
//         fontWeight: '400', 
//         color: getColor(statusA),
//         display: 'flex',
//         alignItems: 'center',
//         gap: '0.5rem'
//       }}>
//         {valueA}
//         {statusA === 'better' && <span style={{ fontSize: '0.875rem' }}>✓</span>}
//       </div>
//       <div style={{ 
//         fontSize: '1.125rem', 
//         fontWeight: '400', 
//         color: getColor(statusB),
//         display: 'flex',
//         alignItems: 'center',
//         gap: '0.5rem'
//       }}>
//         {valueB}
//         {statusB === 'better' && <span style={{ fontSize: '0.875rem' }}>✓</span>}
//       </div>
//     </div>
//   );
// }

// // Summary Card Component
// function SummaryCard({ title, summary }) {
//   return (
//     <div style={{ 
//       backgroundColor: 'white', 
//       border: '1px solid #e5ddd5',
//       borderRadius: '12px', 
//       padding: '2rem',
//       boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
//     }}>
//       <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '1rem' }}>
//         {title}
//       </h3>
//       <p style={{ color: '#666666', lineHeight: '1.7', fontSize: '0.875rem' }}>
//         {summary}
//       </p>
//     </div>
//   );
// }

// // Navigation Component
// function Navigation() {
//   return (
//     <nav style={{ borderBottom: '1px solid #e5ddd5', backgroundColor: 'white' }}>
//       <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//         <Link to="/" style={{ fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', textDecoration: 'none', letterSpacing: '-0.01em' }}>
//           Deal Insights
//         </Link>
//         <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.9375rem' }}>
//           <Link to="/" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Upload</Link>
//           <Link to="/dashboard" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Dashboard</Link>
//           <Link to="/compare" style={{ color: '#1a1a1a', fontWeight: '500', textDecoration: 'none', borderBottom: '2px solid #d4a574', paddingBottom: '0.25rem' }}>Compare</Link>
//           <Link to="/history" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>History</Link>
//         </div>
//       </div>
//     </nav>
//   );
// }

// export default CompareDeals;