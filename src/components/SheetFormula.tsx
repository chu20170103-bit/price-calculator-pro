import { useState } from 'react';
import { Copy, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface PresetForFormula {
  minutes: number;
  people: number;
  cost: number;
  price: number;
}

interface SheetFormulaProps {
  presets: PresetForFormula[];
}

export function SheetFormula({ presets }: SheetFormulaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minutesRef, setMinutesRef] = useState('L84');
  const [peopleRef, setPeopleRef] = useState('M84');

  // Sort presets by minutes then people for logical order
  const sortedPresets = [...presets].sort((a, b) => 
    a.minutes !== b.minutes ? a.minutes - b.minutes : a.people - b.people
  );

  // Generate IF formula based on presets (uses both minutes and people)
  const generateFormula = () => {
    if (presets.length === 0) return '';
    
    let formula = '';
    sortedPresets.forEach((preset, index) => {
      const condition = `AND(${minutesRef}=${preset.minutes},${peopleRef}=${preset.people})`;
      if (index === 0) {
        formula = `IF(${condition},"${preset.cost}"`;
      } else {
        formula = `IF(${condition},"${preset.cost}",${formula}`;
      }
    });
    
    formula = '=' + formula + ')'.repeat(sortedPresets.length);
    
    return formula;
  };

  // Generate price formula
  const generatePriceFormula = () => {
    if (presets.length === 0) return '';
    
    let formula = '';
    sortedPresets.forEach((preset, index) => {
      const condition = `AND(${minutesRef}=${preset.minutes},${peopleRef}=${preset.people})`;
      if (index === 0) {
        formula = `IF(${condition},"${preset.price}"`;
      } else {
        formula = `IF(${condition},"${preset.price}",${formula}`;
      }
    });
    
    formula = '=' + formula + ')'.repeat(sortedPresets.length);
    
    return formula;
  };

  const handleCopy = async (formula: string, name: string) => {
    const ok = await copyToClipboard(formula);
    if (ok) toast.success(`${name}公式已複製`);
    else toast.error('無法複製');
  };

  const costFormula = generateFormula();
  const priceFormula = generatePriceFormula();

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Sheet 公式產生器</span>
        {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                儲存格參照（分鐘欄位）
              </label>
              <input
                type="text"
                value={minutesRef}
                onChange={(e) => setMinutesRef(e.target.value)}
                className="input-field"
                placeholder="例如: L84"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                儲存格參照（次數欄位）
              </label>
              <input
                type="text"
                value={peopleRef}
                onChange={(e) => setPeopleRef(e.target.value)}
                className="input-field"
                placeholder="例如: M84"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-muted-foreground">
                成本公式
              </label>
              <button
                onClick={() => handleCopy(costFormula, '成本')}
                className="btn-ghost flex items-center gap-1 text-xs px-2 py-1"
              >
                <Copy className="w-3 h-3" />
                複製
              </button>
            </div>
            <textarea
              readOnly
              value={costFormula}
              className="input-field h-20 resize-none text-xs font-mono"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-muted-foreground">
                售價公式
              </label>
              <button
                onClick={() => handleCopy(priceFormula, '售價')}
                className="btn-ghost flex items-center gap-1 text-xs px-2 py-1"
              >
                <Copy className="w-3 h-3" />
                複製
              </button>
            </div>
            <textarea
              readOnly
              value={priceFormula}
              className="input-field h-20 resize-none text-xs font-mono"
            />
          </div>
        </div>
      )}
    </div>
  );
}
