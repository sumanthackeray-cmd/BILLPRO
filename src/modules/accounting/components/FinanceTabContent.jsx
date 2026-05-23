export default function FinanceTabContent({ activeTabData, ActiveComponent }) {
  return (
    <>
      {activeTabData && (
        <div className="flex items-center gap-3 px-1">
          <div className={`w-1 h-6 rounded-full bg-gradient-to-b from-amber-500 to-orange-500`} />
          <div>
            <div className="flex items-center gap-2">
              <activeTabData.icon className={`w-4 h-4 ${activeTabData.color}`} />
              <span className="text-[13px] font-black text-foreground">{activeTabData.name}</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">{activeTabData.desc}</p>
          </div>
        </div>
      )}

      <div className="bg-transparent">
        <ActiveComponent />
      </div>
    </>
  );
}
