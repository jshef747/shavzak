
interface TabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  labels?: string[];
}

export function Tabs({ tabs, active, onChange, labels }: TabsProps) {
  return (
    <div className="flex border-b border-gray-200 mb-4">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active === tab
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {labels?.[i] ?? tab}
        </button>
      ))}
    </div>
  );
}
