import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    const validTypes = ['text/csv', 'application/pdf'];
    const isValid = validTypes.includes(selectedFile.type) || 
                    selectedFile.name.endsWith('.csv') || 
                    selectedFile.name.endsWith('.pdf');
    
    if (!isValid) {
      setError('Please select a CSV or PDF file');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }
    
    setError('');
    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/deals/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      navigate(`/dashboard/${data.dealId || ''}`);
      
    } catch (err) {
      setError('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f6' }}>
      {/* Navigation */}
      <nav style={{ borderBottom: '1px solid #e5ddd5', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ fontSize: '1.25rem', fontWeight: '400', color: '#1a1a1a', textDecoration: 'none', letterSpacing: '-0.01em' }}>
            Deal Insights
          </Link>
          <div style={{ display: 'flex', gap: '2.5rem', fontSize: '0.9375rem' }}>
            <Link to="/" style={{ color: '#1a1a1a', fontWeight: '500', textDecoration: 'none', borderBottom: '2px solid #d4a574', paddingBottom: '0.25rem' }}>Upload</Link>
            <Link to="/dashboard" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Dashboard</Link>
            <Link to="/compare" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>Compare</Link>
            <Link to="/history" style={{ color: '#666666', textDecoration: 'none', transition: 'color 0.2s' }}>History</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '2.75rem', fontWeight: '300', color: '#1a1a1a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Upload Deal Document
          </h1>
          <p style={{ color: '#666666', fontSize: '1.0625rem', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
            Upload your financial deal documents in CSV or PDF format. Our AI will extract key metrics, generate insights, and provide comprehensive risk analysis.
          </p>
        </div>

        {/* Upload Box */}
        <div 
          style={{ 
            border: dragActive ? '2px dashed #d4a574' : '2px dashed #e5ddd5', 
            borderRadius: '12px', 
            padding: file ? '2rem' : '4rem', 
            textAlign: 'center', 
            backgroundColor: dragActive ? '#f9f6f2' : 'white',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)'
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!file ? (
            <div>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                margin: '0 auto 2rem', 
                backgroundColor: '#f5f1ed',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '2.5rem', height: '2.5rem', color: '#d4a574' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <p style={{ fontSize: '1.125rem', color: '#1a1a1a', marginBottom: '0.5rem', fontWeight: '400' }}>
                Drop your file here, or browse
              </p>
              <p style={{ fontSize: '0.875rem', color: '#999999', marginBottom: '2rem' }}>
                Supports CSV and PDF files up to 10MB
              </p>
              
              <label style={{ cursor: 'pointer' }}>
                <span style={{ 
                  display: 'inline-block', 
                  padding: '0.875rem 2.5rem', 
                  backgroundColor: '#1a1a1a', 
                  color: 'white', 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  letterSpacing: '0.02em',
                  transition: 'all 0.2s ease',
                  border: '1px solid #1a1a1a'
                }}>
                  SELECT FILE
                </span>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  accept=".csv,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div>
              {/* File Preview */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1.25rem 1.5rem', 
                backgroundColor: '#f5f1ed', 
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '1px solid #e8d5c4'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    backgroundColor: '#e8d5c4',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{ width: '1.5rem', height: '1.5rem', color: '#b88a5f' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '0.9375rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.25rem' }}>{file.name}</p>
                    <p style={{ fontSize: '0.8125rem', color: '#999999' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {!uploading && (
                  <button 
                    onClick={() => setFile(null)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#999999', 
                      cursor: 'pointer', 
                      padding: '0.5rem',
                      transition: 'color 0.2s'
                    }}
                  >
                    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{ 
                  padding: '0.875rem 3rem', 
                  backgroundColor: uploading ? '#cccccc' : '#1a1a1a', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  cursor: uploading ? 'not-allowed' : 'pointer', 
                  letterSpacing: '0.02em',
                  transition: 'all 0.2s ease'
                }}
              >
                {uploading ? 'ANALYZING...' : 'UPLOAD & ANALYZE'}
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '8px', 
            fontSize: '0.875rem', 
            color: '#c33', 
            textAlign: 'center' 
          }}>
            {error}
          </div>
        )}

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              margin: '0 auto 1rem',
              backgroundColor: '#f5f1ed',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.75rem' }}>🤖</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.5rem' }}>AI-Powered Analysis</h3>
            <p style={{ fontSize: '0.875rem', color: '#999999', lineHeight: '1.5' }}>
              Automatically extract key metrics and generate intelligent insights
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              margin: '0 auto 1rem',
              backgroundColor: '#f5f1ed',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.75rem' }}>📊</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.5rem' }}>Visual Dashboards</h3>
            <p style={{ fontSize: '0.875rem', color: '#999999', lineHeight: '1.5' }}>
              View trends and metrics in beautiful interactive charts
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              margin: '0 auto 1rem',
              backgroundColor: '#f5f1ed',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.75rem' }}>⚠️</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1a1a', marginBottom: '0.5rem' }}>Risk Detection</h3>
            <p style={{ fontSize: '0.875rem', color: '#999999', lineHeight: '1.5' }}>
              Identify potential risks and opportunities with automated analysis
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

  export default Upload;