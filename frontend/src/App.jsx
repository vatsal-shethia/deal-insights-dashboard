import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';
import CompareDeals from './components/CompareDeals';
import History from './components/History';
// import DealList from './components/DealList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:dealId" element={<Dashboard />} />
        <Route path="/compare" element={<CompareDeals />} />
        <Route path="/history" element={<History />} />
        {/* <Route path="/history" element={<DealList />} /> */}
        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
      </Routes>
    </Router>
  );
}

export default App;