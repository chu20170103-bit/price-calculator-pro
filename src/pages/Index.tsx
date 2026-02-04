import { useCallback, useState } from 'react';
import { NamedPresetProfile } from '@/hooks/useNamedPresets';
import { Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { PresetManager } from '@/components/PresetManager';
import { HistoryList } from '@/components/HistoryList';
import { SheetFormula } from '@/components/SheetFormula';
import { QuickPresetBuilder, PresetForFormula } from '@/components/QuickPresetBuilder';
import { NamedPresetList } from '@/components/NamedPresetList';
import { useGameStore } from '@/hooks/useGameStore';
import { useNamedPresets } from '@/hooks/useNamedPresets';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
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

  const { saveNow } = useSupabaseSync({
    games,
    currentGameId,
    namedProfiles: profiles,
    loadGames: loadGamesFromCloud,
    loadProfiles: loadProfilesFromCloud,
  });

  /** 刪除方案紀錄後立即寫入雲端 */
  const handleDeleteProfile = useCallback(
    (id: string) => {
      console.log('[操作紀錄] 刪除方案紀錄，即將寫入雲端');
      deleteProfile(id);
      setTimeout(() => saveNow(), 100);
    },
    [deleteProfile, saveNow]
  );

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
                  console.log('[操作紀錄] 新增方案紀錄', name, '，即將寫入雲端');
                  addProfile(name, rows);
                  rows.forEach(row => addHistoryEntry(rowToHistoryEntry(name, row)));
                  setTimeout(() => saveNow(), 100);
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

          {/* Right column: Named presets + History */}
          <section className="card-elevated space-y-5">
            <NamedPresetList profiles={profiles} onDelete={handleDeleteProfile} onImport={handleImportNamedProfile} />

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
