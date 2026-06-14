import { FileUp, ImageUp, Link2, Sheet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActiveUploadTab } from "../../model/entities/ActiveUploadTab";

const tabs: { id: ActiveUploadTab; label: string; icon: React.ReactNode }[] = [
  { id: "url", label: "URL", icon: <Link2 className="h-3.5 w-3.5" /> },
  { id: "pdf", label: "PDF", icon: <FileUp className="h-3.5 w-3.5" /> },
  { id: "csv", label: "CSV", icon: <Sheet className="h-3.5 w-3.5" /> },
  { id: "image", label: "Image", icon: <ImageUp className="h-3.5 w-3.5" /> },
];

interface UploadTabsProps {
  activeTab: ActiveUploadTab;
  onChange: (tab: ActiveUploadTab) => void;
}

export function UploadTabs({ activeTab, onChange }: UploadTabsProps) {
  return (
    <div className="flex gap-1 mb-6 bg-white rounded-rm-trip-smooth p-1 border border-gray-100 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center justify-center gap-1 py-1.5 px-3 rounded-[0.4rem] text-xs font-semibold transition-all duration-200",
            activeTab === tab.id
              ? "bg-rm-trip-brand text-white"
              : "text-rm-trip-text-muted hover:text-rm-trip-text hover:bg-gray-50",
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
