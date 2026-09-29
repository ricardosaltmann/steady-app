import React, { useState } from 'react';
import { DailySupplementData, SupplementItem, SupplementCategory } from '../../types';
import { X, Plus, Flame, Pill, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

interface SupplementModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplementData: DailySupplementData;
  onSaveData: (data: DailySupplementData) => void;
}

export const SupplementModal: React.FC<SupplementModalProps> = ({
  isOpen,
  onClose,
  supplementData,
  onSaveData,
}) => {
  const [items, setItems] = useState<SupplementItem[]>(supplementData.items);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SupplementCategory>('vitamin');
  const [newTargetDose, setNewTargetDose] = useState('1');
  const [newUnit, setNewUnit] = useState('cáps');
  const [newNotes, setNewNotes] = useState('');

  if (!isOpen) return null;

  const handleUpdateItem = (id: string, updates: Partial<SupplementItem>) => {
    const updated = items.map(item => item.id === id ? { ...item, ...updates } : item);
    setItems(updated);
    onSaveData({ ...supplementData, items: updated });
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    onSaveData({ ...supplementData, items: updated });
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: SupplementItem = {
      id: `supp_${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      targetDose: parseFloat(newTargetDose) || 1,
      unit: newUnit.trim() || 'dose',
      takenDose: 0,
      completed: false,
      notes: newNotes.trim() || undefined,
    };

    const updated = [...items, newItem];
    setItems(updated);
    onSaveData({ ...supplementData, items: updated });
    setIsAddingNew(false);
    setNewName('');
    setNewNotes('');
  };

  const handleResetDay = () => {
    const reset = items.map(i => ({ ...i, completed: false, takenDose: 0, timeTaken: undefined }));
    setItems(reset);
    onSaveData({ ...supplementData, items: reset });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#10121a] border border-white/[0.1] rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Stack de Suplementação</h3>
                {supplementData.streakDays > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    {supplementData.streakDays} dias
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie metas diárias de creatina, whey e vitaminas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Suplementos Ativos ({items.length})
            </span>
            <button
              type="button"
              onClick={handleResetDay}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              title="Zerar registros de hoje"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Zerar Hoje</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map(item => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                      item.completed
                        ? 'bg-[#ccff00] border-[#ccff00] text-black'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {item.completed && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                  </div>
                  <div>
                    <span className="text-sm font-black text-white block">{item.name}</span>
                    <span className="text-xs text-[#ccff00] font-mono">
                      Meta: {item.targetDose} {item.unit}
                    </span>
                    {item.notes && (
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {item.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                    title="Remover suplemento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Supplement Form */}
          {isAddingNew ? (
            <form onSubmit={handleAddNewItem} className="p-4 rounded-2xl bg-black/60 border border-white/[0.1] space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Novo Suplemento / Vitamina
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Magnésio Quelato"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as SupplementCategory)}
                    className="w-full mt-1 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                  >
                    <option value="vitamin">Vitamina / Mineral</option>
                    <option value="creatine">Creatina</option>
                    <option value="whey">Proteína / Whey</option>
                    <option value="other">Outro Suplemento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Dose Alvo</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ex: 5"
                    value={newTargetDose}
                    onChange={e => setNewTargetDose(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Unidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: g, cáps, UI"
                    value={newUnit}
                    onChange={e => setNewUnit(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Observações / Objetivo</label>
                <input
                  type="text"
                  placeholder="Ex: Tomar antes de dormir"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white focus:border-[#ccff00] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  Adicionar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-dashed border-white/[0.12] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#ccff00]" />
              <span>+ Adicionar Suplemento Customizado</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Dica: A creatina acumulada satura os estoques musculares. Mantenha o streak diário!
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#ccff00] hover:bg-[#bfe600] text-black text-xs font-black transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
