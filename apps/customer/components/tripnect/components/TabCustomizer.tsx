import { useState } from 'react';
import { clsx } from 'clsx';
import { X, GripVertical, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TabConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
  locked?: boolean; // "ทั้งหมด" ต้องอยู่เสมอ
}

interface TabCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: TabConfig[];
  onSave: (tabs: TabConfig[]) => void;
}

export function TabCustomizer({ isOpen, onClose, tabs, onSave }: TabCustomizerProps) {
  const [localTabs, setLocalTabs] = useState<TabConfig[]>(tabs);

  const handleToggle = (id: string) => {
    setLocalTabs(prev => prev.map(tab => 
      tab.id === id ? { ...tab, enabled: !tab.enabled } : tab
    ));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newTabs = [...localTabs];
    [newTabs[index - 1], newTabs[index]] = [newTabs[index], newTabs[index - 1]];
    setLocalTabs(newTabs.map((tab, i) => ({ ...tab, order: i })));
  };

  const handleMoveDown = (index: number) => {
    if (index === localTabs.length - 1) return;
    const newTabs = [...localTabs];
    [newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]];
    setLocalTabs(newTabs.map((tab, i) => ({ ...tab, order: i })));
  };

  const handleReset = () => {
    const defaultTabs: TabConfig[] = [
      { id: 'all', label: 'ทั้งหมด', enabled: true, order: 0, locked: true },
      { id: 'friends', label: 'เพื่อน', enabled: true, order: 1 },
      { id: 'groups', label: 'กลุ่ม', enabled: true, order: 2 },
      { id: 'official', label: 'บัญชีทางการ', enabled: true, order: 3 },
      { id: 'driver', label: 'คนขับรถ', enabled: true, order: 4 },
      { id: 'hotel', label: 'โรงแรม', enabled: true, order: 5 },
      { id: 'restaurant', label: 'ร้านอาหาร', enabled: true, order: 6 },
    ];
    setLocalTabs(defaultTabs);
  };

  const handleSave = () => {
    onSave(localTabs);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[200]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[201] max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-[17px] font-bold text-slate-900">จัดการแถบ</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-[13px] font-medium text-orange-500 hover:bg-orange-50 rounded-lg transition-colors active:scale-95"
                >
                  <RotateCcw size={14} className="inline mr-1" />
                  รีเซ็ต
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="px-5 py-3 bg-orange-50/50 border-b border-orange-100">
              <p className="text-[13px] text-slate-600">
                เปิด/ปิดแถบและเรียงลำดับตามต้องการ
              </p>
            </div>

            {/* Tabs List */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-slate-50">
                {localTabs.map((tab, index) => (
                  <div
                    key={tab.id}
                    className={clsx(
                      "flex items-center gap-3 px-5 py-4 transition-colors",
                      tab.enabled ? "bg-white" : "bg-slate-50"
                    )}
                  >
                    {/* Drag Handle */}
                    <div className="text-slate-300">
                      <GripVertical size={20} />
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => !tab.locked && handleToggle(tab.id)}
                      disabled={tab.locked}
                      className={clsx(
                        "relative w-12 h-7 rounded-full transition-all",
                        tab.enabled ? "bg-orange-500" : "bg-slate-200",
                        tab.locked ? "opacity-50 cursor-not-allowed" : "active:scale-95"
                      )}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={clsx(
                          "absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm",
                          tab.enabled ? "left-6" : "left-1"
                        )}
                      />
                    </button>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        "text-[15px] font-medium",
                        tab.enabled ? "text-slate-900" : "text-slate-400"
                      )}>
                        {tab.label}
                        {tab.locked && (
                          <span className="ml-2 text-[11px] text-slate-400">(ค่าเริ่มต้น)</span>
                        )}
                      </p>
                    </div>

                    {/* Move Buttons */}
                    {!tab.locked && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || (index === 1 && localTabs[0].locked)}
                          className={clsx(
                            "w-7 h-7 flex items-center justify-center rounded transition-colors",
                            index === 0 || (index === 1 && localTabs[0].locked)
                              ? "text-slate-200 cursor-not-allowed"
                              : "text-slate-400 hover:text-orange-500 hover:bg-orange-50 active:scale-90"
                          )}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === localTabs.length - 1}
                          className={clsx(
                            "w-7 h-7 flex items-center justify-center rounded transition-colors",
                            index === localTabs.length - 1
                              ? "text-slate-200 cursor-not-allowed"
                              : "text-slate-400 hover:text-orange-500 hover:bg-orange-50 active:scale-90"
                          )}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-4">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 text-[15px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 text-[15px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors active:scale-95"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
