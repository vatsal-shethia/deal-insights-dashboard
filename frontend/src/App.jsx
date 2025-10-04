function App() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Deal Insights Dashboard</h2>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-text-muted transition-colors">Dashboard</a>
              <a href="#" className="hover:text-text-muted transition-colors">Upload</a>
              <a href="#" className="hover:text-text-muted transition-colors">History</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="mb-4">Financial Deal Analysis</h1>
          <p className="text-lg text-text-muted max-w-3xl">
            Upload financial documents to extract key metrics, generate AI-powered insights, 
            and visualize deal performance in a professional dashboard.
          </p>
        </div>

        {/* Quick Action Card */}
        <div className="card mb-12 text-center max-w-2xl mx-auto">
          <h3 className="mb-4">Get Started</h3>
          <p className="text-text-muted mb-6">
            Upload a CSV or PDF file to begin analyzing your deal
          </p>
          <button className="accent">Upload Deal Document</button>
        </div>

        {/* Placeholder for Dashboard Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card">
            <h4 className="mb-3">📊 Metrics Dashboard</h4>
            <p className="text-text-muted text-sm">
              View key financial metrics and performance indicators
            </p>
          </div>
          <div className="card">
            <h4 className="mb-3">🤖 AI Insights</h4>
            <p className="text-text-muted text-sm">
              Get automated summaries and risk analysis
            </p>
          </div>
          <div className="card">
            <h4 className="mb-3">📈 Visualizations</h4>
            <p className="text-text-muted text-sm">
              Interactive charts and trend analysis
            </p>
          </div>
          <div className="card">
            <h4 className="mb-3">🔍 Deal History</h4>
            <p className="text-text-muted text-sm">
              Search and compare past deals
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App