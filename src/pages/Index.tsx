import { useCallback } from 'react';
import { Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { GameSelector } from '@/components/GameSelector';
import { PresetManager } from '@/components/PresetManager';
import { HistoryList } from '@/components/HistoryList';
import { SheetFormula } from '@/components/SheetFormula';
import { QuickPresetBuilder } from '@/components/QuickPresetBuilder';
import { useGameStore } from '@/hooks/useGameStore';
import { Preset, PriceEntry } from '@/types/pricing';

const Index = () => {
  const {
    games,
    currentGame,
    switchGame,
    addGame,
    deleteGame,
    renameGame,
    addPreset,
    deletePreset,
    importPresets,
    deleteHistoryEntry,
    clearHistory,
    importHistory,
  } = useGameStore();

  const handlePresetSelect = useCallback((preset: Preset) => {
    toast.success(`已套用 ${preset.label}`);
  }, []);

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
            <h1 className="text-xl font-bold">價格計算器</h1>
          </div>
          <div className="mt-4">
            <GameSelector
              games={games}
              currentGame={currentGame}
              onSwitch={switchGame}
              onAdd={addGame}
              onDelete={deleteGame}
              onRename={renameGame}
            />
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
                  presets.forEach(p => {
                    addPreset({
                      label: `${p.minutes}分/${p.people}人`,
                      minutes: p.minutes,
                      people: p.people,
                      cost: p.cost,
                      fee: p.fee,
                      price: p.price,
                    });
                  });
                }}
              />
            )}

            {currentGame && (
              <SheetFormula presets={currentGame.presets} />
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

          {/* History Card */}
          <section className="card-elevated space-y-5">
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
