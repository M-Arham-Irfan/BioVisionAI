import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Define valid tab values for type safety
export type DashboardTab = 'overview' | 'scan-history' | 'profile';

interface UseDashboardTabsReturn {
  activeTab: DashboardTab;
  setActiveTabAndUrl: (tab: DashboardTab) => void;
}

export function useDashboardTabs(defaultTab: DashboardTab = 'overview'): UseDashboardTabsReturn {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the tab from URL search params
  const getTabFromUrl = (): DashboardTab => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'overview' || tab === 'scan-history' || tab === 'profile') {
      return tab;
    }
    return defaultTab;
  };
  
  const [activeTab, setActiveTab] = useState<DashboardTab>(getTabFromUrl());
  
  // Update the URL when the tab changes
  const setActiveTabAndUrl = (tab: DashboardTab) => {
    setActiveTab(tab);
    
    // Update the URL with the new tab
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  
  // Keep local state in sync with URL
  useEffect(() => {
    const currentTab = getTabFromUrl();
    if (activeTab !== currentTab) {
      setActiveTab(currentTab);
    }
  }, [location.search]);
  
  return { activeTab, setActiveTabAndUrl };
} 