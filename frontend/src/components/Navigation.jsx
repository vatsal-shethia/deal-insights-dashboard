import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            Deal Insights Dashboard
          </Link>
          <div className="flex gap-6 text-sm font-medium">
            <Link 
              to="/" 
              className={`transition-colors ${isActive('/') ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'}`}
            >
              Upload
            </Link>
            <Link 
              to="/dashboard" 
              className={`transition-colors ${isActive('/dashboard') ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/compare" 
              className={`transition-colors ${isActive('/compare') ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'}`}
            >
              Compare
            </Link>
            <Link 
              to="/history" 
              className={`transition-colors ${isActive('/history') ? 'text-blue-600' : 'text-gray-700 hover:text-gray-900'}`}
            >
              History
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;