
import React, { useState, useMemo } from 'react';
import { 
  Dumbbell, 
  Activity, 
  History, 
  PlusSquare, 
  Plus,
  Trash2,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Save,
  CheckCircle2,
  ChevronRight,
  Layout
} from 'lucide-react';
import { AF_DESIGN_PATTERN, SIDEBAR_MENU, INITIAL_RECORDS, BODY_PARTS } from './constants';
import { DailyRecord, WorkoutSet, CardioData } from './types';

const IconMap: Record<string, any> = {
  History, PlusSquare, Layout
};

export default function App() {
  const [activeMenuId, setActiveMenuId] = useState('dashboard');
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list');
  const [records, setRecords] = useState<DailyRecord[]>(INITIAL_RECORDS);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMemo, setFormMemo] = useState('');
  const [formWorkouts, setFormWorkouts] = useState<WorkoutSet[]>([]);
  const [formCardio, setFormCardio] = useState<CardioData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const activeRecord = useMemo(() => 
    records.find(r => r.id === selectedRecordId), 
  [records, selectedRecordId]);

  const handleAddWorkout = () => {
    const newWorkout: WorkoutSet = {
      id: Math.random().toString(36).substr(2, 9),
      bodyPart: BODY_PARTS[0],
      exerciseName: '',
      sets: 3,
      reps: 10,
      weight: 0
    };
    setFormWorkouts([...formWorkouts, newWorkout]);
  };

  const handleRemoveWorkout = (id: string) => {
    setFormWorkouts(formWorkouts.filter(w => w.id !== id));
  };

  const handleUpdateWorkout = (id: string, field: keyof WorkoutSet, value: any) => {
    setFormWorkouts(formWorkouts.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleSave = () => {
    const newErrors: string[] = [];
    if (!formDate) newErrors.push('日付を選択してください');
    
    formWorkouts.forEach((w, i) => {
      if (!w.exerciseName) newErrors.push(`筋トレ${i+1}: 種目名を入力してください`);
      if (w.weight <= 0) newErrors.push(`筋トレ${i+1}: 重量を入力してください`);
    });

    if (formCardio) {
      if (formCardio.duration <= 0) newErrors.push('有酸素: 時間を入力してください');
      if (formCardio.distance <= 0) newErrors.push('有酸素: 距離を入力してください');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const newRecord: DailyRecord = {
      id: `rec-${Math.random().toString(36).substr(2, 9)}`,
      date: formDate,
      memo: formMemo,
      workouts: formWorkouts,
      cardio: formCardio || undefined,
      createdAt: Date.now()
    };

    setRecords([newRecord, ...records]);
    resetForm();
    setView('list');
    setActiveMenuId('dashboard');
  };

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMemo('');
    setFormWorkouts([]);
    setFormCardio(null);
    setErrors([]);
  };

  return (
    <div className={`flex flex-col md:flex-row min-h-screen font-sans ${AF_DESIGN_PATTERN.theme.background}`}>
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-[#542D8E] text-white flex flex-col sticky top-0 md:h-screen z-20 shadow-2xl">
        <div className="p-8 border-b border-white/10 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <Dumbbell className="text-[#542D8E]" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter italic leading-none">AF MOBILE</h1>
            <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest mt-1">MVP Training App</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-4 px-4 text-[10px] font-black text-purple-300/50 uppercase tracking-[0.2em]">Navigation</div>
          {SIDEBAR_MENU.map(item => {
            const Icon = IconMap[item.icon] || Layout;
            const isActive = activeMenuId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenuId(item.id);
                  if (item.id === 'dashboard') setView('list');
                  if (item.id === 'add-record') {
                    resetForm();
                    setView('add');
                  }
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left mb-1
                  ${isActive ? 'bg-white/15 text-white shadow-md' : 'text-purple-200 hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={18} className={isActive ? 'text-[#EB008B]' : ''} />
                <span className="flex-1 text-sm font-medium">{item.name}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#EB008B]" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center border-b bg-white/80 backdrop-blur-md">
          <div className="flex items-center space-x-4">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <ChevronLeft size={24} />
              </button>
            )}
            <h2 className="text-2xl font-black text-[#542D8E] tracking-tight">
              {view === 'list' ? '記録一覧' : view === 'add' ? '記録の作成' : '記録の詳細'}
            </h2>
          </div>
          {view === 'list' && (
            <button 
              onClick={() => { setView('add'); resetForm(); setActiveMenuId('add-record'); }}
              className="flex items-center space-x-2 bg-[#EB008B] hover:bg-[#d1007b] text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-pink-200 transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>記録する</span>
            </button>
          )}
        </header>

        {/* Dynamic Body */}
        <div className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full">
          {/* VIEW: LIST */}
          {view === 'list' && (
            <div className="space-y-6">
              {records.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                  <Dumbbell size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-bold">まだ記録がありません。</p>
                  <p className="text-sm text-gray-400">最初のトレーニングを記録しましょう！</p>
                </div>
              ) : (
                records.map(record => {
                  const totalSets = record.workouts.reduce((sum, w) => sum + w.sets, 0);
                  return (
                    <div 
                      key={record.id} 
                      onClick={() => { setSelectedRecordId(record.id); setView('detail'); }}
                      className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-purple-50 text-[#542D8E] rounded-2xl flex items-center justify-center">
                            <Calendar size={24} />
                          </div>
                          <div>
                            <p className="text-lg font-black text-gray-900">{record.date}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Training Day</p>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-[#EB008B] transition-colors" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Sets</p>
                          <p className="text-xl font-black text-[#542D8E]">{totalSets}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Cardio Time</p>
                          <p className="text-xl font-black text-[#542D8E]">{record.cardio?.duration || 0}<span className="text-xs">m</span></p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-2xl">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Distance</p>
                          <p className="text-xl font-black text-[#542D8E]">{record.cardio?.distance || 0}<span className="text-xs">k</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW: ADD RECORD */}
          {view === 'add' && (
            <div className="space-y-8 bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-2xl flex items-start space-x-3 border border-red-100">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <ul className="text-xs text-red-600 font-bold space-y-1">
                    {errors.map((err, i) => <li key={i}>・{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">日付</label>
                  <input 
                    type="date" 
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#542D8E] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">体調メモ (任意)</label>
                  <input 
                    type="text" 
                    placeholder="今日の調子はどうですか？"
                    value={formMemo}
                    onChange={(e) => setFormMemo(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-[#542D8E] outline-none font-bold"
                  />
                </div>
              </div>

              {/* Workouts */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-[#542D8E] flex items-center space-x-2">
                    <Dumbbell size={20} />
                    <span>筋トレ内容</span>
                  </h3>
                  <button 
                    onClick={handleAddWorkout}
                    className="text-xs font-black text-[#EB008B] bg-pink-50 px-4 py-2 rounded-full flex items-center space-x-1 hover:bg-pink-100 transition-colors"
                  >
                    <Plus size={14} />
                    <span>行を追加</span>
                  </button>
                </div>
                <div className="space-y-4">
                  {formWorkouts.map((workout, index) => (
                    <div key={workout.id} className="relative p-5 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <button 
                        onClick={() => handleRemoveWorkout(workout.id)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-gray-400 hover:text-red-500 shadow-md rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-black text-gray-400 block mb-1">部位</label>
                          <select 
                            value={workout.bodyPart}
                            onChange={(e) => handleUpdateWorkout(workout.id, 'bodyPart', e.target.value)}
                            className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                          >
                            {BODY_PARTS.map(part => <option key={part} value={part}>{part}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="text-[10px] font-black text-gray-400 block mb-1">種目名</label>
                          <input 
                            type="text"
                            placeholder="ベンチプレス等"
                            value={workout.exerciseName}
                            onChange={(e) => handleUpdateWorkout(workout.id, 'exerciseName', e.target.value)}
                            className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 block mb-1">セット</label>
                          <input 
                            type="number"
                            value={workout.sets}
                            onChange={(e) => handleUpdateWorkout(workout.id, 'sets', parseInt(e.target.value) || 0)}
                            className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 block mb-1">回数</label>
                          <input 
                            type="number"
                            value={workout.reps}
                            onChange={(e) => handleUpdateWorkout(workout.id, 'reps', parseInt(e.target.value) || 0)}
                            className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 block mb-1">重量 (kg)*</label>
                          <input 
                            type="number"
                            value={workout.weight}
                            onChange={(e) => handleUpdateWorkout(workout.id, 'weight', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none ring-1 ring-purple-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {formWorkouts.length === 0 && (
                    <p className="text-center py-4 text-gray-400 text-sm italic font-medium">筋トレが追加されていません</p>
                  )}
                </div>
              </div>

              {/* Cardio Section */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-[#542D8E] flex items-center space-x-2">
                    <Activity size={20} />
                    <span>有酸素運動</span>
                  </h3>
                  <button 
                    onClick={() => setFormCardio(formCardio ? null : { type: 'Running', duration: 0, distance: 0 })}
                    className={`text-xs font-black px-4 py-2 rounded-full transition-colors ${formCardio ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-600'}`}
                  >
                    {formCardio ? '削除' : '追加'}
                  </button>
                </div>
                {formCardio && (
                  <div className="p-5 bg-purple-50 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-purple-400 block mb-1">種別</label>
                      <select 
                        value={formCardio.type}
                        onChange={(e) => setFormCardio({ ...formCardio, type: e.target.value as any })}
                        className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                      >
                        <option value="Running">ランニング</option>
                        <option value="Walking">ウォーキング</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-purple-400 block mb-1">時間 (分)*</label>
                      <input 
                        type="number"
                        value={formCardio.duration}
                        onChange={(e) => setFormCardio({ ...formCardio, duration: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-purple-400 block mb-1">距離 (km)*</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={formCardio.distance}
                        onChange={(e) => setFormCardio({ ...formCardio, distance: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white p-2 rounded-lg text-sm font-bold border-none outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-6">
                <button 
                  onClick={handleSave}
                  className="w-full py-4 bg-[#542D8E] text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <Save size={24} />
                  <span>記録を保存する</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: DETAIL */}
          {view === 'detail' && activeRecord && (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-[#542D8E] text-white rounded-3xl flex items-center justify-center shadow-lg">
                      <Calendar size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-gray-900">{activeRecord.date}</h3>
                      <p className="text-sm font-bold text-[#EB008B] uppercase tracking-widest">Training Log Details</p>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 text-green-600 rounded-2xl flex items-center space-x-2">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-black uppercase">Completed</span>
                  </div>
                </div>

                {activeRecord.memo && (
                  <div className="mb-10 p-6 bg-gray-50 rounded-3xl border-l-8 border-[#542D8E]">
                    <h4 className="text-xs font-black text-gray-400 uppercase mb-2">体調メモ</h4>
                    <p className="text-lg font-bold text-gray-700 leading-relaxed italic">"{activeRecord.memo}"</p>
                  </div>
                )}

                {/* Workout List */}
                <div className="mb-10">
                  <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center space-x-2">
                    <Dumbbell className="text-[#542D8E]" size={24} />
                    <span>筋トレ一覧</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-100 text-left">
                          <th className="pb-4 text-xs font-black text-gray-400 uppercase">部位</th>
                          <th className="pb-4 text-xs font-black text-gray-400 uppercase">種目</th>
                          <th className="pb-4 text-xs font-black text-gray-400 uppercase text-center">セット</th>
                          <th className="pb-4 text-xs font-black text-gray-400 uppercase text-center">回数</th>
                          <th className="pb-4 text-xs font-black text-gray-400 uppercase text-right">重量</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activeRecord.workouts.map(w => (
                          <tr key={w.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-5 font-bold text-sm text-purple-600">{w.bodyPart}</td>
                            <td className="py-5 font-black text-gray-800">{w.exerciseName}</td>
                            <td className="py-5 font-bold text-center">{w.sets}</td>
                            <td className="py-5 font-bold text-center">{w.reps}</td>
                            <td className="py-5 font-black text-right text-lg text-[#542D8E]">{w.weight}<span className="text-xs ml-1">kg</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cardio Detail */}
                {activeRecord.cardio && (
                  <div className="p-8 bg-purple-50 rounded-[2rem]">
                    <h4 className="text-lg font-black text-[#542D8E] mb-6 flex items-center space-x-2">
                      <Activity size={24} />
                      <span>有酸素詳細</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-purple-400 uppercase mb-1">種別</p>
                        <p className="text-xl font-black text-gray-800">{activeRecord.cardio.type === 'Running' ? 'ランニング' : 'ウォーキング'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-purple-400 uppercase mb-1">時間</p>
                        <p className="text-xl font-black text-gray-800">{activeRecord.cardio.duration}<span className="text-sm font-bold ml-1">min</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-purple-400 uppercase mb-1">距離</p>
                        <p className="text-xl font-black text-gray-800">{activeRecord.cardio.distance}<span className="text-sm font-bold ml-1">km</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto px-8 py-10 border-t bg-gray-50 flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#542D8E] rounded flex items-center justify-center">
              <Dumbbell size={16} className="text-white" />
            </div>
            <p className="text-sm font-bold text-gray-400">
              © 2023 Anytime Fitness MVP. Get to a Healthier Place.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
