export default function FinanceTabs({ TABS, activeTab, setActiveTab }) {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-2 shadow-sm overflow-x-auto">
      <div className="flex gap-1 min-w-max md:min-w-0 md:flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : tab.color}`} />
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
