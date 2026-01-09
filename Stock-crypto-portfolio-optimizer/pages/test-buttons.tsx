import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function TestButtons() {
  const [clickCount, setClickCount] = useState(0);
  const router = useRouter();

  const handleTestClick = () => {
    setClickCount(prev => prev + 1);
    console.log('Button clicked! Count:', clickCount + 1);
  };

  const handleNavigation = (path: string) => {
    console.log('Navigating to:', path);
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="text-center space-y-6">
        <h1 className="text-white text-3xl font-bold">Button Test Page</h1>
        
        <div className="space-y-4">
          <button
            onClick={handleTestClick}
            className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium"
          >
            Test Click (Count: {clickCount})
          </button>

          <button
            onClick={() => handleNavigation('/register')}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium"
          >
            Go to Register
          </button>

          <button
            onClick={() => handleNavigation('/login')}
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 rounded-xl text-white font-medium"
          >
            Go to Login
          </button>

          <button
            onClick={() => handleNavigation('/home')}
            className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-medium"
          >
            Go to Home
          </button>
        </div>

        <div className="text-white">
          <p>Click count: {clickCount}</p>
          <p>Current path: {router.asPath}</p>
        </div>
      </div>
    </div>
  );
} 