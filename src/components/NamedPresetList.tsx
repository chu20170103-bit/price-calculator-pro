import { useState } from 'react';
import { User, Trash2, ChevronDown, ChevronRight, ArrowDownToLine } from 'lucide-react';
import { NamedPresetProfile } from '@/hooks/useNamedPresets';
import { toast } from 'sonner';

interface NamedPresetListProps {
  profiles: NamedPresetProfile[];
  onDelete: (id: string) => void;
  onImport: (profile: NamedPresetProfile) => void;
}

export function NamedPresetList({ profiles, onDelete, onImport }: NamedPresetListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const selected = profiles.find(p => p.id === selectedId);

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      onDelete(id);
      if (selectedId === id) setSelectedId(null);
      setDeleteConfirmId(null);
      toast.success('已刪除');
    } else {
      setDeleteConfirmId(id);
    }
  };

  const formatPrice = (row: { cost: number; fee: number; profit: number }) =>
    (row.cost + row.fee + row.profit).toLocaleString();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  if (profiles.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          方案紀錄（依姓名）
        </h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          在左側輸入姓名並匯入方案後按「儲存」，紀錄會顯示在這裡
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <User className="w-4 h-4" />
        方案紀錄（依姓名）
      </h3>
      <div className="space-y-1 max-h-[240px] overflow-y-auto">
        {profiles.map(p => (
          <div
            key={p.id}
            className="rounded-lg border border-border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setSelectedId(prev => (prev === p.id ? null : p.id))}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                selectedId === p.id
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-card hover:bg-muted/50'
              }`}
            >
              {selectedId === p.id ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate flex-1">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.rows.length} 筆</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleDelete(p.id);
                }}
                className={`p-1.5 rounded ${
                  deleteConfirmId === p.id ? 'bg-destructive text-destructive-foreground' : 'hover:bg-destructive/20'
                }`}
                title={deleteConfirmId === p.id ? '再按一次刪除' : '刪除'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </button>
            {selectedId === p.id && (
              <div className="border-t border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    儲存於 {formatDate(p.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onImport(p);
                    }}
                    className="btn-primary !h-[25px] text-xs flex items-center gap-1.5 py-1 px-1.5"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    匯入
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1 text-xs font-medium text-muted-foreground">
                  <div className="col-span-1">分</div>
                  <div className="col-span-1">次</div>
                  <div className="col-span-1">成本</div>
                  <div className="col-span-1">手續費</div>
                  <div className="col-span-1">利潤</div>
                  <div className="col-span-1">售價</div>
                </div>
                {p.rows.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-6 gap-1 text-xs py-1 border-b border-border/50 last:border-0"
                  >
                    <div>{row.minutes}</div>
                    <div>{row.people}</div>
                    <div>{row.cost}</div>
                    <div>{row.fee}</div>
                    <div>{row.profit}</div>
                    <div className="font-medium text-accent">{formatPrice(row)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
