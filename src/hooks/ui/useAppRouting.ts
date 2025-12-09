import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export type ViewState = 'landing' | 'chat' | 'admin';

export function useAppRouting() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Helper to derive view from path
    const getViewFromPath = (pathname: string): ViewState => {
        if (pathname === '/admin') return 'admin';
        if (pathname === '/chat') return 'chat';
        return 'landing';
    };
    
    const [view, setView] = useState<ViewState>(() => getViewFromPath(location.pathname));
    
    // Sync view state with URL changes
    useEffect(() => {
        const newView = getViewFromPath(location.pathname);
        setView(newView);
    }, [location.pathname]);
    
    // Update URL when view changes (but not from URL change)
    const setViewAndNavigate = useCallback((newView: ViewState) => {
        setView(newView);
        if (newView === 'admin') {
            void navigate('/admin', { replace: true });
        } else if (newView === 'chat') {
            void navigate('/chat', { replace: true });
        } else {
            void navigate('/', { replace: true });
        }
    }, [navigate]);

    return { 
        view, 
        setView: setViewAndNavigate 
    };
}
