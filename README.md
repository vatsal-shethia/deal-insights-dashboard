# 💼 Deal Insights Dashboard

## AI-Powered Financial Deal Analysis Platform

---

## 🧠 Overview

The **Deal Insights Dashboard** is an intelligent analytics platform designed to dramatically accelerate the evaluation of **private equity** and **corporate investment opportunities**.

It automatically parses complex financial reports (PDF or CSV), extracts all key metrics, and leverages the **Google Gemini AI** to generate investor-grade insights—including deal quality assessments, critical valuation signals, and comprehensive financial health reports.

Built for **finance professionals, analysts, and developers**, this platform transforms raw company data into actionable, high-precision investment intelligence.

---

## ✨ Core Highlights

| Feature | Description |
| :--- | :--- |
| **📊 Smart Financial Parsing** | Reads complex PDFs and CSVs with flexible header recognition, automatic unit conversion, and intelligent normalization. |
| **🧮 Valuation Intelligence** | Calculates key ratios (EV/EBITDA, Debt Ratios, Margins) and assigns financial health scores vs. sector benchmarks. |
| **🤖 AI Deal Assessment** | Uses **Gemini** to provide a concise, reasoned assessment classifying the deal as “**Attractive**,” “**Neutral**,” or “**Cautious**.” |
| **🧩 Deal Comparison Engine** | Compares two companies head-to-head and identifies the better investment, complete with detailed reasoning. |
| **💬 AI Chat Assistant** | Enables natural language Q&A for deep, deal-specific analysis and quick information retrieval. |
| **🧠 Resilient Logic** | Intelligently fills missing critical financial metrics (e.g., EBITDA-based estimations) to ensure a complete analysis. |

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

| Type | Format | Max Size | Notes |
| :--- | :--- | :--- | :--- |
| **CSV** | `.csv` | 10 MB | Accepts multiple header formats, currency symbols, and units (M, B, %). |
| **PDF** | `.pdf` | 10 MB | Parses text-based reports and semi-structured financial summaries. |

### CSV Header Flexibility

The parser intelligently normalizes messy financial headers to a standard format:

| Metric | Accepted Headers |
| :--- | :--- |
| **Revenue** | `revenue`, `sales`, `total_revenue`, `net_sales` |
| **EBITDA** | `ebitda`, `earnings`, `operating_income`, `op_profit` |
| **Net Income** | `net_income`, `profit`, `net_earnings` |
| **Assets** | `total_assets`, `assets` |
| **Liabilities** | `total_liabilities`, `debt`, `total_debt` |
| **Cash Flow** | `cash_flow`, `operating_cash_flow`, `ocf` |

**Also Handles:** Currency symbols ($\text{\$}$, $\text{€}$, $\text{₹}$), brackets for negatives ($(500) \rightarrow -500$), Units ($\text{1.25M / 2B / 300K}$), and Percentages ($\text{12.5\%} \rightarrow 12.5$).

### PDF Pattern Recognition

The AI is trained to recognize real-world financial text patterns in unstructured documents, such as:

* `Total Revenue: $3.25 billion`
* `EBITDA stood at $680M`
* `Debt-to-EBITDA ratio: 1.8x`
* `Revenue Growth: 12%`

---

## 🔍 Example AI Output

| Section | Content |
| :--- | :--- |
| **Deal Summary** | Apex Materials Inc. shows consistent revenue growth with $\text{\$3.2B}$ in sales and a $\text{14\%}$ YoY increase. Strong EBITDA margins ($\text{18\%}$) and conservative leverage ($\text{1.7x Debt/EBITDA}$) indicate robust fundamentals. |
| **Deal Signal** | **Attractive** |

### Minimum Data Required

| Requirement | Description |
| :--- | :--- |
| **✅ Revenue** | Mandatory for analysis. |
| **✅ Any 1 additional metric** | EBITDA, Assets, or Liabilities. |
| **💡 Recommended** | Net Income, Cash Flow, and Growth Rate provide the most comprehensive analysis. |

---

## 🧰 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | `React.js` + `Tailwind CSS` |
| **Backend** | `Node.js` + `Express` |
| **AI Engine** | **Google Gemini** (via `@google/genai`) |
| **Parsing** | `pdf-parse`, `csv-parser`, `multer` |
| **Storage** | In-memory cache (DB-ready architecture) |

### 🏗️ Project Architecture