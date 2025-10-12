                                            💼 Deal Insights Dashboard

                                    AI-Powered Financial Deal Analysis Platform

🧠 Overview

Deal Insights Dashboard is an intelligent analytics platform that evaluates private equity and corporate investment opportunities.
It automatically parses financial reports (PDF or CSV), extracts key metrics, and uses Google Gemini AI to generate investor-grade insights — including deal quality, valuation signals, and financial health assessments.

Built for finance professionals, analysts, and developers, the dashboard transforms raw company data into actionable investment intelligence.

✨ Core Highlights

📊 Smart Financial Parsing – Reads complex PDFs and CSVs with flexible header recognition and automatic unit conversion.

🧮 Valuation Intelligence – Calculates EV/EBITDA, Debt Ratios, Margins, and assigns health scores vs. sector benchmarks.

🤖 AI Deal Assessment – Uses Gemini to explain why a deal is “Attractive,” “Neutral,” or “Cautious.”

🧩 Deal Comparison Engine – Compares two companies and identifies which is the better investment, with reasoning.

💬 AI Chat Assistant – Enables deal-specific natural language Q&A.

🧠 Resilient Logic – Fills missing financial metrics intelligently (e.g., EBITDA-based estimations).

🧰 Tech Stack
Layer	Technology
Frontend	React.js + Tailwind CSS
Backend	Node.js + Express
AI Engine	Google Gemini (via @google/genai)
Parsing	pdf-parse, csv-parser, multer
Storage	In-memory cache (DB-ready architecture)
🏗️ Project Architecture
deal-insights-dashboard/
│
├── backend/
│   ├── controllers/       # Core logic for analysis, comparison, chat
│   ├── middlewares/       # Upload, validation, error handling
│   ├── routes/            # Organized API endpoints
│   ├── utils/             # Metric extraction & calculations
│   ├── server.js          # Express entry point
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, Compare, History
│   │   ├── components/    # Reusable UI elements
│   │   ├── hooks/
│   │   └── App.jsx
│
└── README.md

📁 Supported File Types
Type	Format	Max Size	Notes
CSV	.csv	10 MB	Accepts multiple header formats, currency symbols, units (M, B, %)
PDF	.pdf	10 MB	Parses text-based reports and financial summaries
📊 CSV Header Flexibility

Your parser intelligently normalizes messy financial headers.

Metric	Accepted Headers
Revenue	revenue, sales, total_revenue, net_sales
EBITDA	ebitda, earnings, operating_income, op_profit
Net Income	net_income, profit, net_earnings
Assets	total_assets, assets
Liabilities	total_liabilities, debt, total_debt
Cash Flow	cash_flow, operating_cash_flow, ocf

Also handles:

Currency symbols ($, €, ₹)

Brackets for negatives: (500) → -500

Units: 1.25M / 2B / 300K

Percentages: 12.5% → 12.5

🧾 PDF Pattern Recognition

The AI recognizes real-world financial text patterns like:

Total Revenue: $3.25 billion
EBITDA stood at $680M
Net Income reached $410 million
Debt-to-EBITDA ratio: 1.8x
Cash Flow from Operations: $520M
Revenue Growth: 12%


It supports text-based and semi-structured PDFs — ideal for investor reports or company presentations.

⚙️ How It Works

File Upload
Upload a company’s PDF or CSV.
The backend validates, parses, and normalizes the data.

Metric Extraction
Extracts financials like Revenue, EBITDA, Liabilities, and calculates ratios:

Debt-to-EBITDA

Profit Margin

Current Ratio

EV/EBITDA

AI Insight Generation
Gemini analyzes the financial profile and provides:

Executive Summary

Key Risks & Opportunities

Deal Signal & Health Score

Explanation: “Why this deal is Attractive”

Interactive Dashboard
Displays metrics, charts, and AI insights — all in a clean, investor-style UI.

Deal Comparison
Compare two deals; Gemini summarizes which is more investible and why.

🔍 Example AI Output

Deal Summary

Apex Materials Inc. shows consistent revenue growth with $3.2B in sales and a 14% YoY increase.
Strong EBITDA margins (18%) and conservative leverage (1.7x Debt/EBITDA) indicate robust fundamentals.
Hence, it is an Attractive deal.

🧩 API Endpoints
Method	Endpoint	Purpose
POST	/api/deals/upload	Upload and analyze files
POST	/api/deals/:dealId/ask	Ask deal-specific AI questions
POST	/api/deals/compare	Compare two deals
GET	/api/deals	Retrieve all uploaded deals
GET	/api/deals/:dealId	Get a specific deal
GET	/api/health	Check API health and configuration
🧠 Installation Guide
Clone the Repository
git clone https://github.com/yourusername/deal-insights-dashboard.git
cd deal-insights-dashboard

Setup Backend
cd backend
npm install


Add a .env file:

PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key


Start the server:

npm start

Setup Frontend
cd frontend
npm install
npm run dev

🔒 Minimum Data Required
Requirement	Description
✅ Revenue	Mandatory
✅ Any 1 additional metric	EBITDA, Assets, or Liabilities
💡 Recommended	Net Income, Cash Flow, Growth Rate
🌐 Ideal Use Cases

Private Equity & Venture Capital Analysis

Financial Due Diligence Automation

Corporate Strategy & M&A Evaluation

Finance-focused AI Research Projects

Educational Finance & Valuation Demonstrations

👨‍💻 Developer

Vatsal Shethia
Software Engineer | Fintech & AI Enthusiast
🔗 LinkedIn
 • GitHub

🏁 Future Enhancements

 Integrate Database (MongoDB / PostgreSQL)

 Add Authentication and User Profiles

 Export AI Reports as PDFs

 OCR Layer for Scanned PDFs

 Benchmarking Across Multiple Deals

🪙 Vision

“To bridge the gap between raw financial data and intelligent investment insights —
empowering analysts with clarity, speed, and AI-driven precision.”