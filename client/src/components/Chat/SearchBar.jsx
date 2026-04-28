// client/src/components/Chat/SearchBar.jsx
import { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SearchBar = ({ onSearchResults, searchType = 'messages' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e) => {
    const searchQuery = e.target.value;
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      if (searchType === 'messages') {
        endpoint = `/search/messages?q=${encodeURIComponent(searchQuery)}`;
      } else if (searchType === 'dm') {
        endpoint = `/search/dm?q=${encodeURIComponent(searchQuery)}`;
      } else if (searchType === 'users') {
        endpoint = `/search/users?q=${encodeURIComponent(searchQuery)}`;
      }

      const { data } = await api.get(endpoint);
      setResults(data.messages || data.users || []);
      setShowResults(true);
      onSearchResults(data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 p-3 border-b border-light">
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="🔍 Search messages..."
          className="flex-1 bg-light border border-gray-600 rounded-xl px-4 py-2 
                     text-white placeholder-gray-500 focus:outline-none 
                     focus:border-primary text-sm"
        />
      </div>

      {/* Results Dropdown */}
      {showResults && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-light rounded-xl 
                        border border-gray-600 max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No results found</div>
          ) : (
            <div className="p-2">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  className="w-full text-left p-3 hover:bg-darker rounded-lg 
                             transition border-b border-darker last:border-0"
                >
                  {searchType === 'users' ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={result.avatar}
                        alt={result.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm text-white font-medium">
                          {result.username}
                        </p>
                        <p className="text-xs text-gray-400">{result.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-white truncate">
                        {result.content}
                      </p>
                      <p className="text-xs text-gray-400">
                        {result.sender?.username} •{' '}
                        {new Date(result.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;