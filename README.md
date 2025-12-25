<h1 align="center">💼 Deal Insights Dashboard</h1>
<h2 align="center">AI-Powered Financial Deal Analysis Platform</h2>

---

## 🧠 Overview

The **Deal Insights Dashboard** is an intelligent analytics platform designed to dramatically accelerate the evaluation of **private equity** and **corporate investment opportunities**.

It automatically parses complex financial reports (PDF or CSV), extracts all key metrics, and leverages the **Google Gemini AI** to generate investor-grade insights—including deal quality assessments, critical valuation signals, and comprehensive financial health reports.

Built for **finance professionals, analysts, and developers**, this platform transforms raw company data into actionable, high-precision investment intelligence.

---

## 🔗 Live URLs

- **Frontend (Vercel):**  
  https://deal-insights-frontend.vercel.app _(example — replace with actual)_

- **Backend API (Render):**  
  https://deal-insights-backend.onrender.com

---

## ✨ Core Highlights

| Feature                        | Description                                                                                                                           |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| **📊 Smart Financial Parsing** | Reads complex PDFs and CSVs with flexible header recognition, automatic unit conversion, and intelligent normalization.               |
| **🧮 Valuation Intelligence**  | Calculates key ratios (EV/EBITDA, Debt Ratios, Margins) and assigns financial health scores vs. sector benchmarks.                    |
| **🤖 AI Deal Assessment**      | Uses **Gemini** to provide a concise, reasoned assessment classifying the deal as “**Attractive**,” “**Neutral**,” or “**Cautious**.” |
| **🧩 Deal Comparison Engine**  | Compares two companies head-to-head and identifies the better investment, complete with detailed reasoning.                           |
| **💬 AI Chat Assistant**       | Enables natural language Q&A for deep, deal-specific analysis and quick information retrieval.                                        |
| **🧠 Resilient Logic**         | Intelligently fills missing critical financial metrics (e.g., EBITDA-based estimations) to ensure a complete analysis.                |

---

## ⚙️ How It Works

1.  **File Upload:** A company's PDF or CSV is uploaded. The backend validates, parses, and normalizes the raw data.
2.  **Metric Extraction:** Core financials (Revenue, EBITDA, Liabilities) are extracted, and key ratios are calculated: Debt-to-EBITDA, Profit Margin, Current Ratio, EV/EBITDA.
3.  **AI Insight Generation:** **Gemini** analyzes the complete financial profile to provide an **Executive Summary**, **Key Risks & Opportunities**, a final **Deal Signal**, and a detailed **Explanation** (e.g., "Why this deal is Attractive").
4.  **Interactive Dashboard:** Metrics, charts, and AI insights are presented in a clean, investor-style UI.
5.  **Deal Comparison:** Two deals are compared, with the AI summarizing which is more investible and why.

---

## 📁 Supported File Types & Flexibility

### Format & Specifications

| Type    | Format | Max Size | Notes                                                                   |
| :------ | :----- | :------- | :---------------------------------------------------------------------- |
| **CSV** | `.csv` | 10 MB    | Accepts multiple header formats, currency symbols, and units (M, B, %). |
| **PDF** | `.pdf` | 10 MB    | Parses text-based reports and semi-structured financial summaries.      |

### CSV Header Flexibility

The parser intelligently normalizes messy financial headers to a standard format:

| Metric          | Accepted Headers                                      |
| :-------------- | :---------------------------------------------------- |
| **Revenue**     | `revenue`, `sales`, `total_revenue`, `net_sales`      |
| **EBITDA**      | `ebitda`, `earnings`, `operating_income`, `op_profit` |
| **Net Income**  | `net_income`, `profit`, `net_earnings`                |
| **Assets**      | `total_assets`, `assets`                              |
| **Liabilities** | `total_liabilities`, `debt`, `total_debt`             |
| **Cash Flow**   | `cash_flow`, `operating_cash_flow`, `ocf`             |

**Also Handles:** Currency symbols ($\text{$}$, $\text{€}$, $\text{₹}$), brackets for negatives ($(500) \rightarrow -500$), Units ($\text{1.25M / 2B / 300K}$), and Percentages ($\text{12.5\%} \rightarrow 12.5$).

### PDF Pattern Recognition

The AI is trained to recognize real-world financial text patterns in unstructured documents, such as:

- `Total Revenue: $3.25 billion`
- `EBITDA stood at $680M`
- `Debt-to-EBITDA ratio: 1.8x`
- `Revenue Growth: 12%`

---

## 🔍 Example AI Output

| Section          | Content                                                                                                                                                                                                                                       |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deal Summary** | Apex Materials Inc. shows consistent revenue growth with $\text{\$3.2B}$ in sales and a $\text{14\%}$ YoY increase. Strong EBITDA margins ($\text{18\%}$) and conservative leverage ($\text{1.7x Debt/EBITDA}$) indicate robust fundamentals. |
| **Deal Signal**  | **Attractive**                                                                                                                                                                                                                                |

### Minimum Data Required

| Requirement                    | Description                                                                     |
| :----------------------------- | :------------------------------------------------------------------------------ |
| **✅ Revenue**                 | Mandatory for analysis.                                                         |
| **✅ Any 1 additional metric** | EBITDA, Assets, or Liabilities.                                                 |
| **💡 Recommended**             | Net Income, Cash Flow, and Growth Rate provide the most comprehensive analysis. |

---

## 🧰 Tech Stack

| Layer         | Technology                              |
| :------------ | :-------------------------------------- |
| **Frontend**  | `React.js` + `Tailwind CSS`             |
| **Backend**   | `Node.js` + `Express`                   |
| **AI Engine** | **Google Gemini** (via `@google/genai`) |
| **Parsing**   | `pdf-parse`, `csv-parser`, `multer`     |
| **Storage**   | In-memory cache (DB-ready architecture) |

### 🏗️ Project Architecture

deal-insights-dashboard/
├── backend/
│ ├── controllers/ # Core logic for analysis, comparison, chat
│ ├── middlewares/ # Upload, validation, error handling
│ ├── routes/ # Organized API endpoints
│ ├── utils/ # Metric extraction & calculations
│ └── server.js # Express entry point
│
├── frontend/
│ └── src/
│ ├── pages/ # Dashboard, Compare, History views
│ ├── components/ # Reusable UI elements
│ └── App.jsx
│
└── README.md

---

## 🧠 Installation Guide

## 🛠️ Installation & Local Setup

This project is a full-stack application consisting of a **React (Vite) frontend** and a **Node.js (Express) backend**.  
Both services must be running locally for the application to function correctly.

---

## 📋 Prerequisites

Ensure the following are installed on your system:

- **Node.js** (v18 or higher recommended)
- **npm** (bundled with Node.js)
- **Git**
- **Gemini API Key** (required for AI analysis)

Verify installations:

```bash
node -v
npm -v
git --version

1️⃣ Clone the Repository
git clone https://github.com/vatsal-shethia/deal-insights-dashboard.git
cd deal-insights-dashboard

2️⃣ Backend Setup (Node.js + Express)
Navigate to backend directory
cd backend

Install dependencies
npm install

Create environment variables

Create a .env file inside the backend folder:

PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here


⚠️ Do not commit .env files to version control.

Start the backend server
npm start


Expected output:

Server running on port 5000
Gemini API Key configured: true


Backend will be available at:

http://localhost:5000

3️⃣ Frontend Setup (React + Vite)

Open a new terminal window, then:

cd frontend
npm install

Create frontend environment variables

Create a .env file inside the frontend directory:

VITE_API_BASE_URL=http://localhost:5000


ℹ️ Vite requires environment variables to be prefixed with VITE_.

Start the frontend development server
npm run dev


Frontend will be available at:

http://localhost:5173

4️⃣ Running the Application Locally

Open http://localhost:5173 in your browser

Upload a CSV or PDF financial document

View generated deal insights and dashboards

Ask questions and compare multiple deals

🔁 Development Notes

Local API requests are routed to http://localhost:5000

Production frontend uses the deployed backend URL

All API interactions are centralized via:

frontend/src/utils/api.js

🧪 Common Issues & Troubleshooting
❌ API requests failing

Ensure backend is running on port 5000

Verify .env variables are loaded correctly

❌ AI analysis not working

Confirm GEMINI_API_KEY is valid

Check backend logs for API errors

❌ File upload errors

Ensure file size and format are supported

Check backend logs for parsing issues

🛑 Stopping the Application

To stop either service, press:

Ctrl + C


in the respective terminal window.
```
