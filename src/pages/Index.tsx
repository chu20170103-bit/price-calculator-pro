import { useState, useMemo, useCallback } from 'react';
import { Save, Plus, Copy, AlertTriangle, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { GameSelector } from '@/components/GameSelector';
import { PresetSelect } from '@/components/PresetSelect';
import { PresetManager } from '@/components/PresetManager';
import { InputField } from '@/components/InputField';
import { StatCard } from '@/components/StatCard';
import { HistoryList } from '@/components/HistoryList';
import { useGameStore } from '@/hooks/useGameStore';
import { FormData, CalculatedStats, Preset, PriceEntry } from '@/types/pricing';

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
    addHistoryEntry,
    deleteHistoryEntry,
    clearHistory,
    importHistory,
    getBaselinePerMin,
  } = useGameStore();

  const [formData, setFormData] = useState<FormData>({
    gameName: '',
    minutes: 60,
    people: 1,
    cost: 1300,
    fee: 200,
    price: 2500,
  });

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const stats = useMemo<CalculatedStats>(() => {
    const { cost, fee, price, minutes, people } = formData;
    const profit = price - cost - fee;
    const profitRate = cost > 0 ? (profit / cost) * 100 : 0;
    const profitPerMin = minutes > 0 ? profit / minutes : 0;
    const pricePerPerson = people > 0 ? Math.round(price / people) : 0;

    return { profit, profitRate, profitPerMin, pricePerPerson };
  }, [formData]);

  const showWarning = useMemo(() => {
    if (formData.minutes < 90) return false;
    const baseline = getBaselinePerMin();
    if (baseline === null) return false;
    return stats.profitPerMin < baseline;
  }, [formData.minutes, stats.profitPerMin, getBaselinePerMin]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    setFormData(prev => ({
      ...prev,
      minutes: preset.minutes,
      people: preset.people,
      cost: preset.cost,
      fee: preset.fee,
      price: preset.price,
    }));
  }, []);

  const handleApplyHistory = useCallback((entry: PriceEntry) => {
    setFormData({
      gameName: entry.gameName,
      minutes: entry.minutes,
      people: entry.people,
      cost: entry.cost,
      fee: entry.fee,
      price: entry.price,
    });
    toast.success('已套用紀錄');
  }, []);

  const handleSaveHistory = useCallback(() => {
    addHistoryEntry({
      gameName: formData.gameName || currentGame?.name || '未命名',
      minutes: formData.minutes,
      people: formData.people,
      cost: formData.cost,
      fee: formData.fee,
      price: formData.price,
      profit: stats.profit,
      profitRate: stats.profitRate,
      profitPerMin: stats.profitPerMin,
      pricePerPerson: stats.pricePerPerson,
    });
    toast.success('已儲存到歷史紀錄');
  }, [formData, stats, currentGame, addHistoryEntry]);

  const handleSavePreset = useCallback(() => {
    const label = `${formData.minutes}分/${formData.people}人`;
    addPreset({
      label,
      minutes: formData.minutes,
      people: formData.people,
      cost: formData.cost,
      fee: formData.fee,
      price: formData.price,
    });
    toast.success('已儲存為預設方案');
  }, [formData, addPreset]);

  const generateQuoteText = useCallback(() => {
    const gameName = formData.gameName || currentGame?.name || '未命名';
    const now = new Date().toLocaleString('zh-TW');
    return `【報價單】
遊戲名稱：${gameName}
方案：${formData.minutes}分/${formData.people}人
成本：$${formData.cost}
經濟費：$${formData.fee}
售價：$${formData.price}
利潤：$${stats.profit}（利潤率 ${stats.profitRate.toFixed(1)}%）
每分鐘利潤：$${stats.profitPerMin.toFixed(1)}
每人均價：$${stats.pricePerPerson}
建立時間：${now}`;
  }, [formData, stats, currentGame]);

  const handleCopyQuote = useCallback(() => {
    navigator.clipboard.writeText(generateQuoteText());
    toast.success('報價已複製到剪貼簿');
  }, [generateQuoteText]);

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
          {/* Input Card */}
          <section className="card-elevated space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              輸入資料
            </h2>

            <InputField
              label="遊戲名稱"
              type="text"
              value={formData.gameName}
              onChange={v => updateField('gameName', v as string)}
              placeholder={currentGame?.name || '輸入遊戲名稱'}
            />

            {currentGame && (
              <PresetSelect
                presets={currentGame.presets}
                onSelect={handlePresetSelect}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="分鐘數"
                value={formData.minutes}
                onChange={v => updateField('minutes', v as number)}
                suffix="分"
              />
              <InputField
                label="人數"
                value={formData.people}
                onChange={v => updateField('people', v as number)}
                suffix="人"
              />
            </div>

            <InputField
              label="成本"
              value={formData.cost}
              onChange={v => updateField('cost', v as number)}
              suffix="$"
            />

            <InputField
              label="經濟費"
              value={formData.fee}
              onChange={v => updateField('fee', v as number)}
              suffix="$"
            />

            <InputField
              label="售價"
              value={formData.price}
              onChange={v => updateField('price', v as number)}
              suffix="$"
            />

            <div className="flex flex-col gap-3 pt-2">
              <button onClick={handleSaveHistory} className="btn-primary flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                存到歷史
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleSavePreset} className="btn-secondary flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  存為預設
                </button>
                <button onClick={handleCopyQuote} className="btn-secondary flex items-center justify-center gap-2">
                  <Copy className="w-5 h-5" />
                  複製報價
                </button>
              </div>
            </div>

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

          {/* Calculation Card */}
          <section className="card-elevated space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              即時計算
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="利潤"
                value={`$${stats.profit.toLocaleString()}`}
                highlight={stats.profit > 0}
              />
              <StatCard
                label="利潤率"
                value={`${stats.profitRate.toFixed(1)}%`}
              />
              <StatCard
                label="每分鐘利潤"
                value={`$${stats.profitPerMin.toFixed(1)}`}
              />
              <StatCard
                label="每人均價"
                value={`$${stats.pricePerPerson.toLocaleString()}`}
              />
            </div>

            {showWarning && (
              <div className="warning-banner flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">
                  長時段每分鐘利潤偏低，建議提高售價或調整經濟費
                </p>
              </div>
            )}

            {/* Quote Preview */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                報價預覽
              </label>
              <textarea
                readOnly
                value={generateQuoteText()}
                className="input-field h-48 resize-none text-sm font-mono"
              />
            </div>
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
