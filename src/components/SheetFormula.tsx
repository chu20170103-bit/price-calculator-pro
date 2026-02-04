import { useState } from 'react';
import { Copy, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { Preset } from '@/types/pricing';
import { toast } from 'sonner';

interface SheetFormulaProps {
  presets: Preset[];
}

export function SheetFormula({ presets }: SheetFormulaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cellRef, setCellRef] = useState('L84');

  // Generate IF formula based on presets
  const generateFormula = () => {
    if (presets.length === 0) return '';
    
    // Sort presets by minutes for logical order
    const sorted = [...presets].sort((a, b) => a.minutes - b.minutes);
    
    // Build nested IF formula
    let formula = '';
    sorted.forEach((preset, index) => {
      if (index === 0) {
        formula = `IF(${cellRef}=${preset.minutes},"${preset.cost}"`;
      } else {
        formula = `IF(${cellRef}=${preset.minutes},"${preset.cost}",${formula}`;
      }
    });
    
    // Close all parentheses
    formula = '=' + formula + ')'.repeat(sorted.length);
    
    return formula;
  };

  // Generate price formula
  const generatePriceFormula = () => {
    if (presets.length === 0) return '';
    
    const sorted = [...presets].sort((a, b) => a.minutes - b.minutes);
    
    let formula = '';
    sorted.forEach((preset, index) => {
      if (index === 0) {
        formula = `IF(${cellRef}=${preset.minutes},"${preset.price}"`;
      } else {
        formula = `IF(${cellRef}=${preset.minutes},"${preset.price}",${formula}`;
      }
    });
    
    formula = '=' + formula + ')'.repeat(sorted.length);
    
    return formula;
  };

  const handleCopy = (formula: string, name: string) => {
    navigator.clipboard.writeText(formula);
    toast.success(`${name}公式已複製`);
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              儲存格參照（分鐘欄位）
            </label>
            <input
              type="text"
              value={cellRef}
              onChange={(e) => setCellRef(e.target.value)}
              className="input-field"
              placeholder="例如: L84"
            />
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
