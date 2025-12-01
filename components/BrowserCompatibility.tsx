import React, { useEffect, useState } from 'react';
import { checkBrowserSupport, getBrowserInfo } from '../utils/browser-compat';

interface BrowserCompatibilityProps {
  isDarkMode?: boolean;
}

export const BrowserCompatibility: React.FC<BrowserCompatibilityProps> = ({ 
  isDarkMode = false 
}) => {
  const [support, setSupport] = useState<ReturnType<typeof checkBrowserSupport> | null>(null);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof getBrowserInfo> | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const result = checkBrowserSupport();
    const info = getBrowserInfo();
    setSupport(result);
    setBrowserInfo(info);
  }, []);

  if (dismissed || !support || support.supported) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] max-w-md mx-4 ${
      isDarkMode ? 'bg-red-900/90 border-red-700' : 'bg-red-50 border-red-200'
    } border-2 rounded-xl shadow-2xl p-4 backdrop-blur-xl`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isDarkMode ? 'bg-red-800' : 'bg-red-100'
        }`}>
          <svg className="w-5 h-5 text-red-600 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm mb-1 ${
            isDarkMode ? 'text-red-200' : 'text-red-900'
          }`}>
            Browser Compatibility Issue
          </h3>
          
          {browserInfo && (
            <p className={`text-xs mb-2 ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              Detected: {browserInfo.name} {browserInfo.version}
            </p>
          )}
          
          <p className={`text-xs mb-2 ${
            isDarkMode ? 'text-red-300' : 'text-red-700'
          }`}>
            Your browser is missing required features:
          </p>
          
          <ul className={`text-xs space-y-1 mb-3 ${
            isDarkMode ? 'text-red-300' : 'text-red-700'
          }`}>
            {support.missing.map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-500"></span>
                {feature}
              </li>
            ))}
          </ul>

          {support.warnings.length > 0 && (
            <>
              <p className={`text-xs mb-2 font-medium ${
                isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
              }`}>
                Limited functionality:
              </p>
              <ul className={`text-xs space-y-1 mb-3 ${
                isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
              }`}>
                {support.warnings.map((warning, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-yellow-500"></span>
                    {warning}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className={`text-xs ${
            isDarkMode ? 'text-red-200' : 'text-red-800'
          } mb-3 p-2 rounded bg-black/10`}>
            <p className="font-medium mb-1">Recommended browsers:</p>
            <ul className="space-y-0.5">
              <li>• Chrome 90+</li>
              <li>• Safari 14+</li>
              <li>• Firefox 88+</li>
              <li>• Edge 90+</li>
            </ul>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isDarkMode
                ? 'bg-red-800 hover:bg-red-700 text-white'
                : 'bg-red-100 hover:bg-red-200 text-red-900'
            }`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

