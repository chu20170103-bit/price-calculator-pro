import { useState } from 'react';
import { ChevronDown, Plus, Trash2, Edit2, Check, X, Gamepad2 } from 'lucide-react';
import { Game } from '@/types/pricing';
import { toast } from 'sonner';

interface GameSelectorProps {
  games: Game[];
  currentGame: Game | undefined;
  onSwitch: (gameId: string) => void;
  onAdd: (name: string) => void;
  onDelete: (gameId: string) => void;
  onRename: (gameId: string, newName: string) => void;
}

export function GameSelector({
  games,
  currentGame,
  onSwitch,
  onAdd,
  onDelete,
  onRename,
}: GameSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = () => {
    if (newGameName.trim()) {
      onAdd(newGameName.trim());
      setNewGameName('');
      setIsAdding(false);
      toast.success('遊戲已新增');
    }
  };

  const handleRename = (gameId: string) => {
    if (editName.trim()) {
      onRename(gameId, editName.trim());
      setEditingId(null);
      toast.success('遊戲已更名');
    }
  };

  const handleDelete = (gameId: string) => {
    if (deleteConfirmId === gameId) {
      onDelete(gameId);
      setDeleteConfirmId(null);
      setIsOpen(false);
      toast.success('遊戲已刪除');
    } else {
      setDeleteConfirmId(gameId);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full h-14 px-4 rounded-xl bg-card border border-border shadow-md hover:shadow-lg transition-shadow"
      >
        <Gamepad2 className="w-5 h-5 text-accent" />
        <span className="flex-1 text-left font-medium truncate">
          {currentGame?.name || '選擇遊戲'}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsOpen(false);
              setDeleteConfirmId(null);
            }} 
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {games.map(game => (
                <div
                  key={game.id}
                  className={`flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors ${
                    game.id === currentGame?.id ? 'bg-muted' : ''
                  }`}
                >
                  {editingId === game.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="input-field h-10 flex-1"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleRename(game.id)}
                      />
                      <button onClick={() => handleRename(game.id)} className="p-2 hover:bg-success/20 rounded-lg">
                        <Check className="w-4 h-4 text-success" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 hover:bg-muted rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onSwitch(game.id);
                          setIsOpen(false);
                        }}
                        className="flex-1 text-left truncate"
                      >
                        {game.name}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(game.id);
                          setEditName(game.name);
                        }}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        className={`p-2 rounded-lg ${
                          deleteConfirmId === game.id 
                            ? 'bg-destructive text-destructive-foreground' 
                            : 'hover:bg-destructive/20'
                        }`}
                      >
                        <Trash2 className={`w-4 h-4 ${
                          deleteConfirmId === game.id ? '' : 'text-muted-foreground'
                        }`} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-border p-3">
              {isAdding ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newGameName}
                    onChange={e => setNewGameName(e.target.value)}
                    placeholder="輸入遊戲名稱"
                    className="input-field h-10 flex-1"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  />
                  <button onClick={handleAdd} className="p-2 hover:bg-success/20 rounded-lg">
                    <Check className="w-4 h-4 text-success" />
                  </button>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-muted rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-2 w-full p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增遊戲</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
