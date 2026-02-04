import { useState } from 'react';
import { Search, Trash2, Copy, ArrowRight, Download, Upload, Eraser } from 'lucide-react';
import { PriceEntry } from '@/types/pricing';
import { toast } from 'sonner';

interface HistoryListProps {
  history: PriceEntry[];
  onApply: (entry: PriceEntry) => void;
  onDelete: (entryId: string) => void;
  onClear: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
}

export function HistoryList({
  history,
  onApply,
  onDelete,
  onClear,
  onExport,
  onImport,
}: HistoryListProps) {
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  const filteredHistory = history.filter(entry => {
    const searchLower = search.toLowerCase();
    return (
      entry.gameName.toLowerCase().includes(searchLower) ||
      entry.minutes.toString().includes(search) ||
      entry.people.toString().includes(search) ||
      entry.price.toString().includes(search) ||
      entry.cost.toString().includes(search)
    );
  });

  const handleDelete = (entryId: string) => {
    if (deleteConfirmId === entryId) {
      onDelete(entryId);
      setDeleteConfirmId(null);
      toast.success('紀錄已刪除');
    } else {
      setDeleteConfirmId(entryId);
    }
  };

  const handleClear = () => {
    if (clearConfirm) {
      onClear();
      setClearConfirm(false);
      toast.success('歷史紀錄已清空');
    } else {
      setClearConfirm(true);
    }
  };

  const handleCopyJson = (entry: PriceEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    toast.success('JSON 已複製');
  };

  const handleImport = () => {
    try {
      onImport(importJson);
      setImportJson('');
      setShowImport(false);
      toast.success('歷史紀錄已匯入');
    } catch {
      toast.error('JSON 格式錯誤');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋遊戲名/分鐘/人數/金額..."
          className="input-field pl-12"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleClear}
          className={`btn-ghost flex items-center gap-2 text-sm ${
            clearConfirm ? 'bg-destructive text-destructive-foreground' : ''
          }`}
        >
          <Eraser className="w-4 h-4" />
          {clearConfirm ? '確認清空' : '清空全部'}
        </button>
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

      {/* Import Panel */}
      {showImport && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
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

      {/* History List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {search ? '找不到符合的紀錄' : '尚無歷史紀錄'}
          </div>
        ) : (
          filteredHistory.map(entry => (
            <div key={entry.id} className="history-item">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{entry.gameName}</div>
                  <div className="text-sm text-muted-foreground">
                    {entry.minutes}分/{entry.people}人 · ${entry.cost}+${entry.fee} → ${entry.price}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(entry.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onApply(entry)}
                    className="p-2 hover:bg-accent/20 rounded-lg"
                    title="套用"
                  >
                    <ArrowRight className="w-4 h-4 text-accent" />
                  </button>
                  <button
                    onClick={() => handleCopyJson(entry)}
                    className="p-2 hover:bg-muted rounded-lg"
                    title="複製 JSON"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className={`p-2 rounded-lg ${
                      deleteConfirmId === entry.id 
                        ? 'bg-destructive text-destructive-foreground' 
                        : 'hover:bg-destructive/20'
                    }`}
                    title="刪除"
                  >
                    <Trash2 className={`w-4 h-4 ${
                      deleteConfirmId === entry.id ? '' : 'text-muted-foreground'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
