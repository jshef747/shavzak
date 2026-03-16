
interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  labels?: string[];
}

export function Tabs({ tabs, active, onChange, labels }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 overflow-x-auto scrollbar-none">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          role="tab"
          aria-selected={active === tab}
          onClick={() => onChange(tab)}
          className={`flex-1 shrink-0 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            active === tab
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          {labels?.[i] ?? tab}
        </button>
      ))}
    </div>
  );
}
