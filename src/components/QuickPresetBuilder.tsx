import { useState, useMemo } from 'react';
import { Copy, Wand2, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface PresetRow {
  id: string;
  minutes: number;
  people: number;
  cost: number;
  fee: number;
  profit: number;
}

interface QuickPresetBuilderProps {
  onApplyPresets: (presets: Array<{
    minutes: number;
    people: number;
    cost: number;
    fee: number;
    price: number;
  }>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

// Parse input like "30/1/900+1" or "60/2/1700+2"
const parsePresetInput = (input: string): PresetRow | null => {
  const match = input.trim().match(/^(\d+)\/(\d+)\/(\d+)\+(\d+)$/);
  if (!match) return null;
  
  const [, minutes, people, cost, feeMultiplier] = match;
  return {
    id: generateId(),
    minutes: parseInt(minutes, 10),
    people: parseInt(people, 10),
    cost: parseInt(cost, 10),
    fee: parseInt(feeMultiplier, 10) * 100, // +1 = 100, +2 = 200, +3 = 300
    profit: 0,
  };
};

// Format price for display: 1700 -> "1.7", 2300 -> "2.3"
const formatPrice = (price: number): string => {
  return (price / 1000).toFixed(1);
};

export function QuickPresetBuilder({ onApplyPresets }: QuickPresetBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<PresetRow[]>([
    { id: generateId(), minutes: 30, people: 1, cost: 900, fee: 100, profit: 700 },
    { id: generateId(), minutes: 40, people: 1, cost: 1000, fee: 200, profit: 600 },
    { id: generateId(), minutes: 60, people: 1, cost: 1300, fee: 200, profit: 800 },
    { id: generateId(), minutes: 60, people: 2, cost: 1700, fee: 200, profit: 900 },
    { id: generateId(), minutes: 90, people: 2, cost: 2200, fee: 300, profit: 800 },
  ]);
  const [bulkInput, setBulkInput] = useState('');

  // Calculate price for each row
  const calculatedRows = useMemo(() => {
    return rows.map(row => ({
      ...row,
      price: row.cost + row.fee + row.profit,
    }));
  }, [rows]);

  // Generate formatted output
  const formattedOutput = useMemo(() => {
    return calculatedRows.map(row => 
      `💲${row.minutes}🕸${row.people}S回 ${formatPrice(row.price)}`
    ).join('\n');
  }, [calculatedRows]);

  const handleUpdateRow = (id: string, field: keyof PresetRow, value: number) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, {
      id: generateId(),
      minutes: 60,
      people: 1,
      cost: 1000,
      fee: 200,
      profit: 500,
    }]);
  };

  const handleBulkImport = () => {
    const lines = bulkInput.trim().split('\n').filter(l => l.trim());
    const parsed: PresetRow[] = [];
    
    for (const line of lines) {
      const result = parsePresetInput(line);
      if (result) {
        parsed.push(result);
      }
    }
    
    if (parsed.length > 0) {
      setRows(parsed);
      setBulkInput('');
      toast.success(`已匯入 ${parsed.length} 筆方案`);
    } else {
      toast.error('格式錯誤，請使用 30/1/900+1 格式');
    }
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(formattedOutput);
    toast.success('報價格式已複製');
  };

  const handleApplyToPresets = () => {
    onApplyPresets(calculatedRows.map(row => ({
      minutes: row.minutes,
      people: row.people,
      cost: row.cost,
      fee: row.fee,
      price: row.price,
    })));
    toast.success('已套用為預設方案');
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Wand2 className="w-4 h-4" />
        <span>快速方案產生器</span>
        {isOpen ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {isOpen && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          {/* Bulk Import */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">
              批次匯入（每行一筆，格式：分鐘/人數/成本+手續費倍數）
            </label>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="30/1/900+1&#10;40/1/1000+2&#10;60/1/1300+2&#10;60/2/1700+2&#10;90/2/2200+3"
              className="input-field h-24 resize-none text-sm font-mono"
            />
            <button onClick={handleBulkImport} className="btn-secondary text-sm">
              匯入
            </button>
          </div>

          {/* Rows Table */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              方案列表（輸入利潤自動計算售價）
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {rows.map((row, index) => {
                const calculated = calculatedRows[index];
                return (
                  <div 
                    key={row.id} 
                    className="grid grid-cols-12 gap-2 items-center p-2 bg-card rounded-lg border border-border"
                  >
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={row.minutes || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'minutes', parseInt(e.target.value) || 0)}
                        className="input-field text-xs py-1 px-2"
                        placeholder="分"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        value={row.people || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'people', parseInt(e.target.value) || 0)}
                        className="input-field text-xs py-1 px-2"
                        placeholder="人"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={row.cost || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'cost', parseInt(e.target.value) || 0)}
                        className="input-field text-xs py-1 px-2"
                        placeholder="成本"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={row.fee || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'fee', parseInt(e.target.value) || 0)}
                        className="input-field text-xs py-1 px-2"
                        placeholder="費用"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={row.profit || ''}
                        onChange={(e) => handleUpdateRow(row.id, 'profit', parseInt(e.target.value) || 0)}
                        className="input-field text-xs py-1 px-2 bg-accent/10 border-accent/30"
                        placeholder="利潤"
                      />
                    </div>
                    <div className="col-span-2 text-xs font-medium text-accent">
                      =${calculated.price}
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="p-1 hover:bg-destructive/20 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={handleAddRow} className="btn-ghost text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" />
              新增方案
            </button>
          </div>

          {/* Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-muted-foreground">
                產出報價格式
              </label>
              <button
                onClick={handleCopyOutput}
                className="btn-ghost flex items-center gap-1 text-xs px-2 py-1"
              >
                <Copy className="w-3 h-3" />
                複製
              </button>
            </div>
            <textarea
              readOnly
              value={formattedOutput}
              className="input-field h-32 resize-none text-sm"
            />
          </div>

          <button onClick={handleApplyToPresets} className="btn-primary w-full text-sm">
            套用為預設方案
          </button>
        </div>
      )}
    </div>
  );
}
