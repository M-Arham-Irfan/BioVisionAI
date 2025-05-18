
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ScanType {
  value: string;
  label: string;
  conditions: string[];
}

interface ScanTypeSelectorProps {
  scanType: string;
  scanTypes: ScanType[];
  onScanTypeChange: (value: string) => void;
}

export const ScanTypeSelector = ({ scanType, scanTypes, onScanTypeChange }: ScanTypeSelectorProps) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-300">
        Select Scan Type
      </label>
      <Select 
        value={scanType} 
        onValueChange={onScanTypeChange}
      >
        <SelectTrigger className="bg-white/10 border-white/20 text-white">
          <SelectValue placeholder="Select scan type" />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1b4b] border-white/20 text-white">
          {scanTypes.map((type) => (
            <SelectItem 
              key={type.value} 
              value={type.value}
              className="hover:bg-white/10"
            >
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
