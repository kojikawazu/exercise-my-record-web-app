
import { DesignPattern, DailyRecord } from './types';

export const AF_DESIGN_PATTERN: DesignPattern = {
  id: 'classic-af',
  name: 'Classic Core',
  description: 'Anytime Fitnessの伝統的なパープルとホワイトを基調とした、清潔感とプロフェッショナルさを兼ね備えた標準デザイン。',
  theme: {
    primary: 'bg-[#542D8E]',
    secondary: 'bg-[#8E2D8E]',
    accent: 'text-[#EB008B]',
    background: 'bg-gray-50',
    card: 'bg-white border-gray-200 shadow-sm',
    text: 'text-gray-900',
    button: 'bg-[#542D8E] hover:bg-[#432472] text-white rounded-xl transition-all font-bold',
    border: 'border-[#542D8E]'
  }
};

export const SIDEBAR_MENU = [
  { id: 'dashboard', name: '記録一覧', icon: 'History' },
  { id: 'add-record', name: '記録を追加', icon: 'PlusSquare' },
];

export const BODY_PARTS = [
  '胸 (Chest)', '背中 (Back)', '脚 (Legs)', '肩 (Shoulders)', '腕 (Arms)', '腹筋 (Abs)', 'その他'
];

export const INITIAL_RECORDS: DailyRecord[] = [
  {
    id: 'rec-1',
    date: '2023-11-01',
    memo: '体調良好。スクワットで自己ベスト更新。',
    workouts: [
      { id: 'ws-1', bodyPart: '脚 (Legs)', exerciseName: 'スクワット', sets: 3, reps: 10, weight: 100 },
      { id: 'ws-2', bodyPart: '脚 (Legs)', exerciseName: 'レッグプレス', sets: 3, reps: 12, weight: 150 }
    ],
    cardio: { type: 'Running', duration: 20, distance: 3.5 },
    createdAt: Date.now() - 86400000
  }
];
