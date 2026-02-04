import { useState } from 'react';
import { Trash2, Copy, ArrowRight, Download, Upload, Layers } from 'lucide-react';
import { Preset } from '@/types/pricing';
import { toast } from 'sonner';

interface PresetManagerProps {
  presets: Preset[];
  onApply: (preset: Preset) => void;
  onDelete: (presetId: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

function formatPresetLine(preset: Preset) {
  const cost = preset.cost.toLocaleString();
  const fee = preset.fee.toLocaleString();
  const price = preset.price.toLocaleString();
  return `$${cost}+$${fee} → $${price}`;
}

export function PresetManager({
  presets,
  onApply,
  onDelete,
  onExport,
  onImport,
}: PresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  const systemPresets = presets.filter(p => p.isSystem);
  const customPresets = presets.filter(p => !p.isSystem);

  const handleDelete = (presetId: string) => {
    if (deleteConfirmId === presetId) {
      onDelete(presetId);
      setDeleteConfirmId(null);
      toast.success('預設已刪除');
    } else {
      setDeleteConfirmId(presetId);
    }
  };

  const handleCopyJson = (preset: Preset) => {
    navigator.clipboard.writeText(JSON.stringify(preset, null, 2));
    toast.success('JSON 已複製');
  };

  const handleImport = () => {
    try {
      onImport(importJson);
      setImportJson('');
      setShowImport(false);
      toast.success('預設已匯入');
    } catch {
      toast.error('JSON 格式錯誤');
    }
  };

  const PresetRow = ({ preset }: { preset: Preset }) => (
    <div
      key={preset.id}
      className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border"
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{preset.label}</div>
        <div className="text-xs text-muted-foreground">{formatPresetLine(preset)}</div>
      </div>
      <button
        onClick={() => {
          onApply(preset);
          setIsOpen(false);
        }}
        className="p-2 hover:bg-accent/20 rounded-lg text-accent"
        title="套用至試算表"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleCopyJson(preset)}
        className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
        title="複製 JSON"
      >
        <Copy className="w-4 h-4" />
      </button>
      {!preset.isSystem && (
        <button
          onClick={() => handleDelete(preset.id)}
          className={`p-2 rounded-lg ${
            deleteConfirmId === preset.id
              ? 'bg-destructive text-destructive-foreground'
              : 'hover:bg-destructive/20 text-muted-foreground'
          }`}
          title={deleteConfirmId === preset.id ? '再按一次刪除' : '刪除'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Layers className="w-4 h-4" />
        預設方案
      </button>

      {isOpen && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border">
          <p className="text-xs text-muted-foreground">
            這些方案會顯示在下方試算表，可匯出/匯入備份。點「→」可將單一方案套用至試算表。
          </p>

          <div className="flex flex-wrap gap-2">
            <button onClick={onExport} className="btn-ghost flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              匯出 JSON
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              匯入 JSON
            </button>
          </div>

          {showImport && (
            <div className="space-y-2">
              <textarea
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder="貼上 JSON 資料..."
                className="input-field h-24 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleImport} className="btn-primary text-sm h-10 px-4">
                  匯入
                </button>
                <button onClick={() => setShowImport(false)} className="btn-ghost text-sm h-10">
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {systemPresets.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">系統方案</div>
                <div className="space-y-1.5">
                  {systemPresets.map(preset => (
                    <PresetRow key={preset.id} preset={preset} />
                  ))}
                </div>
              </div>
            )}
            {customPresets.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">自訂方案</div>
                <div className="space-y-1.5">
                  {customPresets.map(preset => (
                    <PresetRow key={preset.id} preset={preset} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
