import React from 'react';
import ScrollIsolatedContainer from './ScrollIsolatedContainer';

const ScrollTest: React.FC = () => {
  return (
    <div className="h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Scroll Isolation Test</h1>
      
      <div className="flex gap-4 h-96">
        {/* Regular scrollable area */}
        <div className="w-1/2 bg-white rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Regular Scroll (affects main page)</h2>
          <div className="h-full overflow-y-auto bg-gray-50 p-4 space-y-2">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i} className="bg-blue-100 p-3 rounded">
                Regular scroll item {i + 1}
              </div>
            ))}
          </div>
        </div>
        
        {/* Isolated scrollable area */}
        <div className="w-1/2 bg-white rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Isolated Scroll (doesn't affect main page)</h2>
          <ScrollIsolatedContainer className="h-full bg-gray-50 p-4">
            <div className="space-y-2">
              {Array.from({ length: 50 }, (_, i) => (
                <div key={i} className="bg-green-100 p-3 rounded">
                  Isolated scroll item {i + 1}
                </div>
              ))}
            </div>
          </ScrollIsolatedContainer>
        </div>
      </div>
      
      {/* Content below to test main page scroll */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Main Page Content</h2>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="bg-yellow-100 p-4 rounded">
            Main page content item {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScrollTest; 