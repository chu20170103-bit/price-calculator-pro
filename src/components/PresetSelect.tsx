import { Preset } from '@/types/pricing';
import { ChevronDown } from 'lucide-react';

interface PresetSelectProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
}

export function PresetSelect({ presets, onSelect }: PresetSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-muted-foreground">
        方案預設
      </label>
      <div className="relative">
        <select
          onChange={(e) => {
            const preset = presets.find(p => p.id === e.target.value);
            if (preset) onSelect(preset);
          }}
          className="input-field appearance-none cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>選擇預設方案</option>
          {presets.map(preset => (
            <option key={preset.id} value={preset.id}>
              {preset.label} - ${preset.price} {preset.isSystem ? '(系統)' : '(自訂)'}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
