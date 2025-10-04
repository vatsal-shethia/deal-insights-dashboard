import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function History() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    filterAndSortDeals();
  }, [deals, searchQuery, selectedIndustry, sortBy]);

  const fetchDeals = async () => {
    // Replace with actual API call
    // const response = await fetch('/api/deals');
    // const data = await response.json();
    
    // Mock data
    const mockDeals = [
      {
        id: '1',
        companyName: 'Tech Innovations Inc.',
        dealName: 'Series B Acquisition',
        dateUploaded: '2025-03-15',
        revenue: 125,
        ebitda: 25,
        debtRatio: 0.65,
        industry: 'Technology',
        summary: 'Strong YoY growth of 15%, driven by expanding operations in APAC. Healthy EBITDA margin of 20%, though debt levels remain slightly elevated.',
        tags: ['Tech', 'Growth'],
        fileName: 'tech_innovations_q4.pdf'
      },
      {
        id: '2',
        companyName: 'Global Health Corp.',
        dealName: 'Market Expansion Deal',
        dateUploaded: '2025-03-10',
        revenue: 98,
        ebitda: 15,
        debtRatio: 0.85,
        industry: 'Healthcare',
        summary: 'Moderate growth with focus on market consolidation. Lower debt levels and strong operational efficiency, but facing competitive pressure.',
        tags: ['Healthcare', 'Expansion'],
        fileName: 'global_health_analysis.csv'
      },
      {
        id: '3',
        companyName: 'Finance Solutions Ltd.',
        dealName: 'Strategic Partnership',
        dateUploaded: '2025-03-05',
        revenue: 210,
        ebitda: 45,
        debtRatio: 0.45,
        industry: 'Finance',
        summary: 'Excellent financial health with strong cash reserves. Leading market position with minimal leverage and consistent profitability.',
        tags: ['Finance', 'Stable'],
        fileName: 'finance_solutions_report.pdf'
      },
      {
        id: '4',
        companyName: 'Retail Connect Inc.',
        dealName: 'E-commerce Merger',
        dateUploaded: '2025-02-28',
        revenue: 156,
        ebitda: 28,
        debtRatio: 0.72,
        industry: 'Retail',
        summary: 'Rapid digital transformation showing positive results. E-commerce growth offsetting brick-and-mortar decline.',
        tags: ['Retail', 'Digital'],
        fileName: 'retail_connect_data.csv'
      },
      {
        id: '5',
        companyName: 'Energy Plus Corp.',
        dealName: 'Green Energy Investment',
        dateUploaded: '2025-02-20',
        revenue: 340,
        ebitda: 68,
        debtRatio: 0.55,
        industry: 'Energy',
        summary: 'Transitioning to renewable energy sources. Strong financial position with growing renewable portfolio.',
        tags: ['Energy', 'Sustainable'],
        fileName: 'energy_plus_assessment.pdf'
      }
    ];
    
    setDeals(mockDeals);
    setFilteredDeals(mockDeals);
    setLoading(false);
  };

  const filterAndSortDeals = () => {
    let filtered = [...deals];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(deal => 
        deal.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.dealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.summary.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Industry filter
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(deal => deal.industry === selectedIndustry);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.dateUploaded) - new Date(a.dateUploaded);
        case 'oldest':
          return new Date(a.dateUploaded) - new Date(b.dateUploaded);
        case 'revenue-high':
          return b.revenue - a.revenue;
        case 'revenue-low':
          return a.revenue - b.revenue;
        case 'name':
          return a.companyName.localeCompare(b.companyName);
        default:
          return 0;
      }
    });

    setFilteredDeals(filtered);
  };

  const handleSelectDeal = (dealId) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDeals.length === filteredDeals.length) {
      setSelectedDeals([]);
    } else {
      setSelectedDeals(filteredDeals.map(deal => deal.id));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedDeals.length} selected deals?`)) {
      // Implement bulk delete API call
      setDeals(prev => prev.filter(deal => !selectedDeals.includes(deal.id)));
      setSelectedDeals([]);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const industries = ['all', ...new Set(deals.map(deal => deal.industry))];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
        <Navigation />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <p style={{ color: '#666666', fontSize: '1.125rem' }}>Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
      <Navigation />
      
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 3rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
            Deal History
          </h1>
          <p style={{ color: '#666666', fontSize: '1rem' }}>
            Browse and search through all your uploaded deals
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5ddd5',
          borderRadius: '12px', 
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.125rem', height: '1.125rem', color: '#999999' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by company, deal name, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 3rem',
                  border: '1px solid #e5ddd5',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#1a1a1a'
                }}
              />
            </div>

            {/* Industry Filter */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5ddd5',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
            >
              {industries.map(industry => (
                <option key={industry} value={industry}>
                  {industry === 'all' ? 'All Industries' : industry}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #e5ddd5',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#1a1a1a',
                backgroundColor: 'white'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="revenue-high">Revenue (High to Low)</option>
              <option value="revenue-low">Revenue (Low to High)</option>
              <option value="name">Name (A-Z)</option>
            </select>

            {/* View Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', border: '1px solid #e5ddd5', borderRadius: '6px', padding: '0.25rem' }}>
              <button
                onClick={() => setViewMode('card')}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: viewMode === 'card' ? '#f5f1ed' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#1a1a1a'
                }}
              >
                <svg style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: viewMode === 'table' ? '#f5f1ed' : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#1a1a1a'
                }}
              >
                <svg style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedDeals.length > 0 && (
          <div style={{ 
            backgroundColor: '#f5f1ed', 
            border: '1px solid #e8d5c4',
            borderRadius: '8px', 
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: '#666666', fontSize: '0.875rem' }}>
              {selectedDeals.length} deal{selectedDeals.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#c33',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              DELETE SELECTED
            </button>
          </div>
        )}

        {/* Results Count */}
        <div style={{ marginBottom: '1.5rem', color: '#666666', fontSize: '0.875rem' }}>
          Showing {filteredDeals.length} of {deals.length} deals
        </div>

        {/* Card View */}
        {viewMode === 'card' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {filteredDeals.map(deal => (
              <DealCard 
                key={deal.id} 
                deal={deal}
                isSelected={selectedDeals.includes(deal.id)}
                onSelect={handleSelectDeal}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5ddd5',
            borderRadius: '12px', 
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f1ed', borderBottom: '1px solid #e5ddd5' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedDeals.length === filteredDeals.length && filteredDeals.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EBITDA</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debt Ratio</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Summary</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8125rem', fontWeight: '600', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map(deal => (
                  <tr key={deal.id} style={{ borderBottom: '1px solid #e5ddd5' }}>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedDeals.includes(deal.id)}
                        onChange={() => handleSelectDeal(deal.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: '500', color: '#1a1a1a', marginBottom: '0.25rem' }}>{deal.companyName}</p>
                        <p style={{ fontSize: '0.75rem', color: '#999999' }}>{deal.industry}</p>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#666666' }}>{formatDate(deal.dateUploaded)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1a1a1a', fontWeight: '500' }}>${deal.revenue}M</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1a1a1a', fontWeight: '500' }}>${deal.ebitda}M</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1a1a1a', fontWeight: '500' }}>{deal.debtRatio}</td>
                    <td style={{ padding: '1rem', fontSize: '0.8125rem', color: '#666666', maxWidth: '300px' }}>
                      {deal.summary.substring(0, 80)}...
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/dashboard/${deal.id}`)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#1a1a1a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          letterSpacing: '0.02em'
                        }}
                      >
                        VIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredDeals.length === 0 && (
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5ddd5',
            borderRadius: '12px', 
            padding: '4rem 2rem',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', marginBottom: '0.5rem' }}>
              No deals found
            </h3>
            <p style={{ color: '#666666', marginBottom: '1.5rem' }}>
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedIndustry('all'); }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              CLEAR FILTERS
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

// Deal Card Component
function DealCard({ deal, isSelected, onSelect, formatDate }) {
  const navigate = useNavigate();

  return (
    <div style={{ 
      backgroundColor: 'white', 
      border: isSelected ? '2px solid #d4a574' : '1px solid #e5ddd5',
      borderRadius: '12px', 
      padding: '1.5rem',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
      transition: 'all 0.2s ease',
      position: 'relative'
    }}>
      
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(deal.id)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          cursor: 'pointer',
          width: '18px',
          height: '18px'
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          backgroundColor: '#f5f1ed',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          flexShrink: 0
        }}>
          📄
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
            {deal.companyName}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#999999' }}>
            {deal.dealName}
          </p>
        </div>
      </div>

      {/* Meta Info */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#666666' }}>
        <span>📅 {formatDate(deal.dateUploaded)}</span>
        <span>🏢 {deal.industry}</span>
      </div>

      {/* Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: '#faf8f6',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div>
          <p style={{ fontSize: '0.6875rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</p>
          <p style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a' }}>${deal.revenue}M</p>
        </div>
        <div>
          <p style={{ fontSize: '0.6875rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EBITDA</p>
          <p style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a' }}>${deal.ebitda}M</p>
        </div>
        <div>
          <p style={{ fontSize: '0.6875rem', color: '#999999', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debt Ratio</p>
          <p style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a' }}>{deal.debtRatio}</p>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {deal.tags.map(tag => (
          <span key={tag} style={{ 
            padding: '0.25rem 0.75rem',
            backgroundColor: '#f5f1ed',
            color: '#b88a5f',
            fontSize: '0.75rem',
            fontWeight: '500',
            borderRadius: '12px'
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Summary */}
      <p style={{ fontSize: '0.8125rem', color: '#666666', lineHeight: '1.5', marginBottom: '1rem' }}>
        {deal.summary.substring(0, 120)}...
      </p>

      {/* Action Button */}
      <button
        onClick={() => navigate(`/dashboard/${deal.id}`)}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: '#1a1a1a',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.8125rem',
          fontWeight: '500',
          cursor: 'pointer',
          letterSpacing: '0.02em',
          transition: 'background-color 0.2s'
        }}
      >
        VIEW DEAL
      </button>
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
          <Link to="/dashboard" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Dashboard</Link>
          <Link to="/compare" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Compare</Link>
          <Link to="/history" style={{ color: '#1a1a1a', fontWeight: '500', textDecoration: 'none', borderBottom: '2px solid #d4a574', paddingBottom: '0.25rem' }}>History</Link>
        </div>
      </div>
    </nav>
  );
}

export default History;