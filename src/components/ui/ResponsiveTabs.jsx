import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * ResponsiveTabs
 * 
 * @param {Array} tabs - Array of objects: { id: 'ai', label: 'AI Projections', icon: <LucideIcon />, disabled: boolean, title: string }
 * @param {String} activeTab - The currently active tab ID
 * @param {Function} setActiveTab - Callback to set the active tab ID
 * @param {String} containerClassName - Optional extra classes for the desktop container
 */
export default function ResponsiveTabs({ tabs, activeTab, setActiveTab, containerClassName }) {
  // Find the currently active tab object to get its label/icon for the SelectValue
  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <>
      {/* =========================================================================
          MOBILE & TABLET VIEW: Dropdown Menu (hidden on desktop)
          ========================================================================= */}
      <div className="block lg:hidden mb-4 animate-fade-up">
        <Select 
          value={activeTab} 
          onValueChange={(val) => {
            const selectedTab = tabs.find(t => t.id === val);
            if (selectedTab && !selectedTab.disabled) {
              setActiveTab(val);
            }
          }}
        >
          <SelectTrigger className="w-full h-12 bg-card/60 backdrop-blur-md border-amber-500/20 text-foreground font-black text-sm shadow-sm rounded-xl">
            <div className="flex items-center gap-2">
              {currentTab?.icon && <span className="text-primary">{currentTab.icon}</span>}
              <SelectValue placeholder="Select Tab">
                {currentTab?.label}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card border-border shadow-2xl rounded-xl z-50">
            {tabs.map((tab) => (
              <SelectItem 
                key={tab.id} 
                value={tab.id} 
                disabled={tab.disabled}
                className={cn(
                  "py-3 cursor-pointer font-bold transition-all focus:bg-primary/10 focus:text-primary",
                  activeTab === tab.id && "bg-primary/5 text-primary",
                  tab.disabled && "opacity-50 cursor-not-allowed"
                )}
                title={tab.title}
              >
                <div className="flex items-center gap-2.5">
                  {tab.icon && <span className={cn(activeTab === tab.id ? "text-primary" : "text-muted-foreground", tab.disabled && "text-muted-foreground/50")}>{tab.icon}</span>}
                  <span>{tab.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* =========================================================================
          DESKTOP VIEW: Luxury Horizontal Tabs (hidden on mobile/tablet)
          ========================================================================= */}
      <div className={cn("hidden lg:flex items-center justify-between p-1.5 bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl shadow-sm mb-4", containerClassName)}>
        <div className="flex gap-2 flex-1 flex-wrap">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => {
                if (!tab.disabled) setActiveTab(tab.id);
              }}
              disabled={tab.disabled}
              title={tab.title}
              className={cn(
                "flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 whitespace-nowrap",
                tab.disabled 
                  ? "text-muted-foreground/40 cursor-not-allowed opacity-50"
                  : activeTab === tab.id 
                    ? "gold-gradient text-black shadow-md shadow-primary/20 scale-105" 
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
