import { useCallback, useState } from 'react';
import { NamedPresetProfile } from '@/hooks/useNamedPresets';
import { Calculator, Cloud, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { PresetManager } from '@/components/PresetManager';
import { HistoryList } from '@/components/HistoryList';
import { SheetFormula } from '@/components/SheetFormula';
import { QuickPresetBuilder, PresetForFormula } from '@/components/QuickPresetBuilder';
import { NamedPresetList } from '@/components/NamedPresetList';
import { useGameStore } from '@/hooks/useGameStore';
import { useNamedPresets } from '@/hooks/useNamedPresets';
import { useSupabaseSync, isSupabaseConfigured } from '@/hooks/useSupabaseSync';
import { copyToClipboard } from '@/lib/utils';
import { Preset, PriceEntry } from '@/types/pricing';

// 將方案紀錄的一筆 row 轉成歷史紀錄用的欄位（不含 id, createdAt）
function rowToHistoryEntry(
  gameName: string,
  row: { minutes: number; people: number; cost: number; fee: number; profit: number }
) {
  const price = row.cost + row.fee + row.profit;
  const profitRate = price > 0 ? (row.profit / price) * 100 : 0;
  const profitPerMin = row.minutes > 0 ? row.profit / row.minutes : 0;
  const pricePerPerson = row.people > 0 ? price / row.people : 0;
  return {
    gameName,
    minutes: row.minutes,
    people: row.people,
    cost: row.cost,
    fee: row.fee,
    price,
    profit: row.profit,
    profitRate,
    profitPerMin,
    pricePerPerson,
  };
}

const Index = () => {
  const {
    games,
    currentGame,
    currentGameId,
    addPreset,
    deletePreset,
    importPresets,
    replacePresets,
    addHistoryEntry,
    deleteHistoryEntry,
    clearHistory,
    importHistory,
    loadFromCloud: loadGamesFromCloud,
  } = useGameStore();
  const { profiles, addProfile, deleteProfile, importProfiles, loadFromCloud: loadProfilesFromCloud } = useNamedPresets();
  const [livePresets, setLivePresets] = useState<PresetForFormula[]>([]);
  const [pendingImport, setPendingImport] = useState<NamedPresetProfile | null>(null);

  const { syncCode, setSyncCode, clearSyncCode, loadBySyncCode, lastSyncedAt } = useSupabaseSync({
    games,
    currentGameId,
    namedProfiles: profiles,
    loadGames: loadGamesFromCloud,
    loadProfiles: loadProfilesFromCloud,
  });
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [loadCodeInput, setLoadCodeInput] = useState('');
  const [showSyncSection, setShowSyncSection] = useState(false);

  const handlePresetSelect = useCallback(
    (preset: Preset) => {
      replacePresets([
        {
          label: preset.label,
          minutes: preset.minutes,
          people: preset.people,
          cost: preset.cost,
          fee: preset.fee,
          price: preset.price,
        },
      ]);
      setLivePresets([]);
      toast.success(`已套用 ${preset.label} 至試算表`);
    },
    [replacePresets]
  );

  const handleApplyHistory = useCallback((entry: PriceEntry) => {
    toast.success('已套用紀錄');
  }, []);

  const handleExportHistory = useCallback(async () => {
    if (!currentGame) return;
    const payload = { history: currentGame.history, namedProfiles: profiles };
    const ok = await copyToClipboard(JSON.stringify(payload, null, 2));
    if (ok) toast.success('歷史紀錄＋方案紀錄 JSON 已複製');
    else toast.error('無法複製，請手動複製');
  }, [currentGame, profiles]);

  const handleImportHistory = useCallback(
    (json: string) => {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        importHistory(parsed);
        toast.success('歷史紀錄已匯入');
        return;
      }
      if (parsed.history && Array.isArray(parsed.history)) {
        importHistory(parsed.history);
      }
      if (parsed.namedProfiles && Array.isArray(parsed.namedProfiles)) {
        importProfiles(parsed.namedProfiles);
      }
      toast.success('歷史紀錄與方案紀錄已匯入');
    },
    [importHistory, importProfiles]
  );

  const handleExportPresets = useCallback(async () => {
    if (!currentGame) return;
    const ok = await copyToClipboard(JSON.stringify(currentGame.presets, null, 2));
    if (ok) toast.success('預設方案 JSON 已複製');
    else toast.error('無法複製，請手動複製');
  }, [currentGame]);

  const handleImportNamedProfile = useCallback((profile: NamedPresetProfile) => {
    setPendingImport(profile);
    toast.success(`已匯入「${profile.name}」的方案`);
  }, []);

  const handleImportComplete = useCallback(() => setPendingImport(null), []);

  const handleImportPresets = useCallback((json: string) => {
    const parsed = JSON.parse(json);
    const presets = Array.isArray(parsed) ? parsed : [parsed];
    importPresets(presets);
  }, [importPresets]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Calculator className="w-8 h-8 text-accent" />
            <h1 className="text-xl font-bold">PRICElady</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Preset Builder Card - Takes 2 columns on desktop */}
          <section className="card-elevated space-y-5 lg:col-span-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              快速方案產生器
            </h2>

            {currentGame && (
              <QuickPresetBuilder
                onApplyPresets={(presets) => {
                  replacePresets(presets.map(p => ({
                    label: `${p.minutes}分/${p.people}人`,
                    minutes: p.minutes,
                    people: p.people,
                    cost: p.cost,
                    fee: p.fee,
                    price: p.price,
                  })));
                }}
                onSaveNamed={(name, rows) => {
                  addProfile(name, rows);
                  rows.forEach(row => addHistoryEntry(rowToHistoryEntry(name, row)));
                }}
                onRowsChange={setLivePresets}
                pendingImport={pendingImport?.rows ?? null}
                onImportComplete={handleImportComplete}
              />
            )}

            {currentGame && (
              <SheetFormula
                presets={
                  livePresets.length > 0
                    ? livePresets
                    : currentGame.presets.map(p => ({
                        minutes: p.minutes,
                        people: p.people,
                        cost: p.cost,
                        fee: p.fee,
                        price: p.price,
                      }))
                }
              />
            )}

            {currentGame && (
              <PresetManager
                presets={currentGame.presets}
                onApply={handlePresetSelect}
                onDelete={deletePreset}
                onExport={handleExportPresets}
                onImport={handleImportPresets}
              />
            )}
          </section>

          {/* Right column: Named presets + History + Sync */}
          <section className="card-elevated space-y-5">
            {isSupabaseConfigured() && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <button
                  type="button"
                  onClick={() => setShowSyncSection(!showSyncSection)}
                  className="flex w-full items-center gap-2 text-sm font-medium text-foreground"
                >
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                  跨裝置同步（同步碼）
                  {showSyncSection ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
                </button>
                {showSyncSection && (
                  <div className="space-y-3 pt-1 text-sm">
                    <p className="text-muted-foreground">
                      新增／刪除／修改會自動同步至雲端（約 1 秒內），不需手動按鈕。
                    </p>
                    {lastSyncedAt && (
                      <p className="text-muted-foreground text-xs">
                        上次同步 {lastSyncedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    )}
                    {syncCode ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">目前同步碼：</span>
                        <code className="rounded bg-muted px-2 py-0.5 font-mono">{syncCode}</code>
                        <button
                          type="button"
                          onClick={clearSyncCode}
                          className="text-muted-foreground underline hover:text-foreground"
                        >
                          清除
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={syncCodeInput}
                          onChange={e => setSyncCodeInput(e.target.value)}
                          placeholder="輸入同步碼（例：PRICE01）"
                          className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setSyncCode(syncCodeInput)}
                          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                        >
                          設定
                        </button>
                      </div>
                    )}
                    <div className="border-t border-border/60 pt-2">
                      <p className="mb-2 text-muted-foreground">在其它瀏覽器／裝置使用：</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={loadCodeInput}
                          onChange={e => setLoadCodeInput(e.target.value)}
                          placeholder="輸入同步碼"
                          className="flex-1 rounded border border-input bg-background px-2 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => loadBySyncCode(loadCodeInput)}
                          className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                        >
                          載入
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <NamedPresetList profiles={profiles} onDelete={deleteProfile} onImport={handleImportNamedProfile} />

            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              歷史紀錄
              {currentGame && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({currentGame.history.length})
                </span>
              )}
            </h2>

            {currentGame && (
              <HistoryList
                history={currentGame.history}
                onApply={handleApplyHistory}
                onDelete={deleteHistoryEntry}
                onClear={clearHistory}
                onExport={handleExportHistory}
                onImport={handleImportHistory}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Index;
