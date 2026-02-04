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
import { Preset, PriceEntry } from '@/types/pricing';

const Index = () => {
  const {
    currentGame,
    addPreset,
    deletePreset,
    importPresets,
    replacePresets,
    deleteHistoryEntry,
    clearHistory,
    importHistory,
  } = useGameStore();
  const { profiles, addProfile, deleteProfile } = useNamedPresets();
  const [livePresets, setLivePresets] = useState<PresetForFormula[]>([]);
  const [pendingImport, setPendingImport] = useState<NamedPresetProfile | null>(null);

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

  const handleExportHistory = useCallback(() => {
    if (!currentGame) return;
    navigator.clipboard.writeText(JSON.stringify(currentGame.history, null, 2));
    toast.success('歷史紀錄 JSON 已複製');
  }, [currentGame]);

  const handleImportHistory = useCallback((json: string) => {
    const parsed = JSON.parse(json);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    importHistory(entries);
  }, [importHistory]);

  const handleExportPresets = useCallback(() => {
    if (!currentGame) return;
    navigator.clipboard.writeText(JSON.stringify(currentGame.presets, null, 2));
    toast.success('預設方案 JSON 已複製');
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
                onSaveNamed={(name, rows) => addProfile(name, rows)}
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
