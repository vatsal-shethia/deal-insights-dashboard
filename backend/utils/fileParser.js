// utils/fileParser.js
const fs = require('fs');
const csv = require('csv-parser');
const pdfParse = require('pdf-parse');

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

//new block
const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  
  try {
    const pdfData = await pdfParse(dataBuffer, {
      // Enable max extraction
      max: 0,  // No page limit
      version: 'v2.0.550'
    });
    
    if (!pdfData.text || pdfData.text.trim().length < 10) {
      throw new Error("Empty PDF text");
    }
    
    console.log(`✓ PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} chars`);
    
    // Try to detect table structures (simple heuristic)
    const hasTableStructure = /[\t\|]{2,}/.test(pdfData.text) || 
                              pdfData.text.split('\n').some(line => 
                                (line.match(/\s{3,}/g) || []).length > 3
                              );
    
    if (hasTableStructure) {
      console.log('⚠️  Detected table structure - may need specialized parsing');
      // Future: Add tabula-js or pdf-table-extractor here
    }
    
    return pdfData.text;
    
  } catch (err) {
    console.error("⚠️ PDF parse failed:", err.message);
    
    // Fallback: raw UTF-8 extraction
    try {
      const rawText = dataBuffer.toString("utf8");
      console.warn("Using raw text fallback (may be garbled)");
      return rawText;
    } catch {
      console.error("❌ Complete PDF extraction failure");
      return "";
    }
  }
};

module.exports = { parseCSV, parsePDF };
