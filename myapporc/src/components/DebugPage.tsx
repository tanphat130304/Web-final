import React, { useState } from 'react';
import ScrollTest from './ScrollTest';
import SubtitleDisplay from './SubtitleDisplay';
import ScrollIsolatedContainer from './ScrollIsolatedContainer';

const DebugPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scrollTest' | 'subtitles' | 'combined'>('scrollTest');

  // Sample subtitle data for testing
  const sampleSubtitles = [
    { id: 1, startTime: '00:00:01,000', endTime: '00:00:03,000', original: 'Hello world', translated: 'Xin chào thế giới' },
    { id: 2, startTime: '00:00:03,000', endTime: '00:00:05,000', original: 'This is a test', translated: 'Đây là một bài test' },
    { id: 3, startTime: '00:00:05,000', endTime: '00:00:07,000', original: 'Scroll isolation working', translated: 'Phân tách scroll đang hoạt động' },
    { id: 4, startTime: '00:00:07,000', endTime: '00:00:09,000', original: 'Great performance', translated: 'Hiệu suất tuyệt vời' },
    { id: 5, startTime: '00:00:09,000', endTime: '00:00:11,000', original: 'No more console errors', translated: 'Không còn lỗi console' },
  ];

  // Generate more subtitles for testing scroll
  const extendedSubtitles = [
    ...sampleSubtitles,
    ...Array.from({ length: 20 }, (_, i) => ({
      id: i + 6,
      startTime: `00:00:${(11 + i * 2).toString().padStart(2, '0')},000`,
      endTime: `00:00:${(13 + i * 2).toString().padStart(2, '0')},000`,
      original: `Sample subtitle ${i + 6}`,
      translated: `Phụ đề mẫu ${i + 6}`
    }))
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Tab Navigation */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('scrollTest')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'scrollTest'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Scroll Isolation Test
            </button>
            <button
              onClick={() => setActiveTab('subtitles')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'subtitles'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Subtitle Display
            </button>
            <button
              onClick={() => setActiveTab('combined')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'combined'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Combined View
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto p-4">
        {activeTab === 'scrollTest' && (
          <div>
            <h1 className="text-2xl font-bold mb-4">🔬 Scroll Isolation Test</h1>
            <p className="text-gray-400 mb-6">
              Test that the ScrollIsolatedContainer prevents wheel events from affecting the main page scroll.
            </p>
            <ScrollTest />
          </div>
        )}

        {activeTab === 'subtitles' && (
          <div className="h-96">
            <h1 className="text-2xl font-bold mb-4">📝 Subtitle Display Test</h1>
            <p className="text-gray-400 mb-6">
              Test the SubtitleDisplay component with sample data and scroll isolation.
            </p>
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <SubtitleDisplay 
                subtitles={extendedSubtitles} 
                maxSceneTime={120}
              />
            </div>
          </div>
        )}

        {activeTab === 'combined' && (
          <div>
            <h1 className="text-2xl font-bold mb-4">🔀 Combined Test View</h1>
            <p className="text-gray-400 mb-6">
              Test both components together to ensure they work harmoniously.
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
              {/* Left: Scroll Test */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Scroll Isolation Demo</h2>
                <ScrollIsolatedContainer className="h-64 bg-gray-700 p-4 rounded">
                  <div className="space-y-2">
                    {Array.from({ length: 30 }, (_, i) => (
                      <div key={i} className="bg-blue-600 p-3 rounded text-white">
                        Demo scroll item {i + 1} - Should not affect main page
                      </div>
                    ))}
                  </div>
                </ScrollIsolatedContainer>
              </div>

              {/* Right: Subtitle Display */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Subtitle Editor</h2>
                <div className="h-64 border border-gray-600 rounded overflow-hidden">
                  <SubtitleDisplay 
                    subtitles={sampleSubtitles} 
                    maxSceneTime={60}
                  />
                </div>
              </div>
            </div>

            {/* Bottom: Main page content for scroll testing */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Main Page Content</h2>
              <p className="text-gray-400 mb-4">
                This content should scroll normally when you scroll outside the isolated containers above.
              </p>
              <div className="space-y-4">
                {Array.from({ length: 15 }, (_, i) => (
                  <div key={i} className="bg-gray-800 p-4 rounded">
                    <h3 className="font-medium">Main page section {i + 1}</h3>
                    <p className="text-gray-400 mt-2">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            Debug Mode Active - Check console for ScrollIsolatedContainer logs
          </div>
          <div className="text-green-400">
            ✅ Passive Event Listener Issue Fixed
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPage; 