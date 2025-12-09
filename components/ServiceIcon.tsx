import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ServiceIconProps {
    iconType: 'book' | 'people' | 'code';
    color: 'orange' | 'blue' | 'purple';
}

export const ServiceIcon: React.FC<ServiceIconProps> = ({
    iconType,
    color
}) => {
    const { isDarkMode } = useTheme();
    const colorClasses = {
        orange: isDarkMode ? 'text-orange-400' : 'text-orange-600',
        blue: isDarkMode ? 'text-blue-400' : 'text-blue-600',
        purple: isDarkMode ? 'text-purple-400' : 'text-purple-600'
    };

    const strokeColor = colorClasses[color];

    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <svg
                className={`w-6 h-6 ${strokeColor} transition-all duration-300 group-hover:scale-110`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
            >
                {iconType === 'book' && (
                    <>
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </>
                )}

                {iconType === 'people' && (
                    <>
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </>
                )}

                {iconType === 'code' && (
                    <>
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                    </>
                )}
            </svg>
        </div>
    );
};
