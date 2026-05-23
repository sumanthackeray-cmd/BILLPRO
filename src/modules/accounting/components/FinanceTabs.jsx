import ResponsiveTabs from "@/components/ui/ResponsiveTabs";

export default function FinanceTabs({ TABS, activeTab, setActiveTab }) {
  return (
    <ResponsiveTabs 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      tabs={TABS.map(tab => {
        const Icon = tab.icon;
        return {
          id: tab.id,
          label: tab.name,
          icon: <Icon className="w-4 h-4" />
        };
      })}
    />
  );
}
