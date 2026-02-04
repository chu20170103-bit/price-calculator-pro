import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Game, Preset, PriceEntry, DEFAULT_PRESETS } from '@/types/pricing';

const generateId = () => Math.random().toString(36).substring(2, 15);

const createDefaultGame = (name: string): Game => ({
  id: generateId(),
  name,
  presets: DEFAULT_PRESETS.map(preset => ({
    ...preset,
    id: generateId(),
  })),
  history: [],
});

export function useGameStore() {
  const [games, setGames] = useLocalStorage<Game[]>('pricing-games', [
    createDefaultGame('預設遊戲'),
  ]);
  const [currentGameId, setCurrentGameId] = useLocalStorage<string>('pricing-current-game', games[0]?.id || '');

  const currentGame = games.find(g => g.id === currentGameId) || games[0];

  const addGame = useCallback((name: string) => {
    const newGame = createDefaultGame(name);
    setGames(prev => [...prev, newGame]);
    setCurrentGameId(newGame.id);
    return newGame;
  }, [setGames, setCurrentGameId]);

  const deleteGame = useCallback((gameId: string) => {
    setGames(prev => {
      const updated = prev.filter(g => g.id !== gameId);
      if (updated.length === 0) {
        const defaultGame = createDefaultGame('預設遊戲');
        setCurrentGameId(defaultGame.id);
        return [defaultGame];
      }
      if (currentGameId === gameId) {
        setCurrentGameId(updated[0].id);
      }
      return updated;
    });
  }, [setGames, currentGameId, setCurrentGameId]);

  const renameGame = useCallback((gameId: string, newName: string) => {
    setGames(prev => prev.map(g => 
      g.id === gameId ? { ...g, name: newName } : g
    ));
  }, [setGames]);

  const switchGame = useCallback((gameId: string) => {
    setCurrentGameId(gameId);
  }, [setCurrentGameId]);

  const addPreset = useCallback((preset: Omit<Preset, 'id' | 'isSystem'>) => {
    const newPreset: Preset = {
      ...preset,
      id: generateId(),
      isSystem: false,
    };
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, presets: [...g.presets, newPreset] }
        : g
    ));
    return newPreset;
  }, [setGames, currentGameId]);

  const deletePreset = useCallback((presetId: string) => {
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, presets: g.presets.filter(p => p.id !== presetId) }
        : g
    ));
  }, [setGames, currentGameId]);

  const importPresets = useCallback((presets: Preset[]) => {
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, presets: [...g.presets, ...presets.map(p => ({ ...p, id: generateId() }))] }
        : g
    ));
  }, [setGames, currentGameId]);

  const replacePresets = useCallback((presets: Omit<Preset, 'id' | 'isSystem'>[]) => {
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, presets: presets.map(p => ({ ...p, id: generateId(), isSystem: false })) }
        : g
    ));
  }, [setGames, currentGameId]);

  const addHistoryEntry = useCallback((entry: Omit<PriceEntry, 'id' | 'createdAt'>) => {
    const newEntry: PriceEntry = {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, history: [newEntry, ...g.history] }
        : g
    ));
    return newEntry;
  }, [setGames, currentGameId]);

  const deleteHistoryEntry = useCallback((entryId: string) => {
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, history: g.history.filter(h => h.id !== entryId) }
        : g
    ));
  }, [setGames, currentGameId]);

  const clearHistory = useCallback(() => {
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, history: [] }
        : g
    ));
  }, [setGames, currentGameId]);

  const importHistory = useCallback((entries: PriceEntry[]) => {
    setGames(prev => prev.map(g => 
      g.id === currentGameId 
        ? { ...g, history: [...entries.map(e => ({ ...e, id: generateId() })), ...g.history] }
        : g
    ));
  }, [setGames, currentGameId]);

  const getBaselinePerMin = useCallback((): number | null => {
    if (!currentGame) return null;
    const baseline = currentGame.history.find(
      h => h.minutes === 60 && h.people === 2
    );
    return baseline?.profitPerMin ?? null;
  }, [currentGame]);

  return {
    games,
    currentGame,
    currentGameId,
    switchGame,
    addGame,
    deleteGame,
    renameGame,
    addPreset,
    deletePreset,
    importPresets,
    replacePresets,
    addHistoryEntry,
    deleteHistoryEntry,
    clearHistory,
    importHistory,
    getBaselinePerMin,
  };
}
