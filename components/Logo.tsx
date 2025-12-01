import React from 'react';

interface LogoProps {
  className?: string;
  isDarkMode?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = "", isDarkMode = false, animated = true, size = 'md' }) => {
  
  // Size mapping
  const dim = {
    sm: { w: 24, h: 24, text: 'text-sm' },
    md: { w: 32, h: 32, text: 'text-lg' },
    lg: { w: 48, h: 48, text: 'text-2xl' },
    xl: { w: 64, h: 64, text: 'text-4xl' },
  }[size];

  const colorPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const colorSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  // const strokeColor = isDarkMode ? 'white' : 'black'; // Not used

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      
      {/* Animated Symbol: "The Neural Node" */}
      <div className={`relative flex items-center justify-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`} style={{ width: dim.w, height: dim.h }}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            {/* Core Node */}
            <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-90" />
            
            {/* Orbiting System */}
            <g className={animated ? "animate-spin-slow origin-center" : ""}>
                {/* Orbit Path (Invisible/Faint) */}
                <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="1" className="opacity-10" />
                
                {/* Satellite Node 1 */}
                <g>
                    <circle cx="50" cy="15" r="5" fill="currentColor" />
                    <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                </g>

                {/* Satellite Node 2 */}
                <g transform="rotate(120 50 50)">
                    <circle cx="50" cy="15" r="4" fill="currentColor" className="opacity-80" />
                    <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
                </g>

                {/* Satellite Node 3 */}
                <g transform="rotate(240 50 50)">
                    <circle cx="50" cy="15" r="3" fill="currentColor" className="opacity-60" />
                </g>
            </g>
        </svg>
      </div>

      {/* Typography: "F.B" (Human) + "/c" (Machine) */}
      <div className={`flex items-baseline leading-none tracking-tight ${dim.text}`}>
        <span className={`font-sans font-bold ${colorPrimary}`}>F.B</span>
        <span className="mx-0.5 text-emerald-500 font-light opacity-80">/</span>
        <span className={`font-mono font-medium ${colorSecondary}`}>c</span>
      </div>
    </div>
  );
};

export default Logo;
