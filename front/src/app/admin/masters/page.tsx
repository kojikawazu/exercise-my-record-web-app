'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Save, Trash2, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';

const masterTabs = [
  { label: '部位', type: 'body-parts' },
  { label: '種目', type: 'exercises' },
  { label: '有酸素種別', type: 'cardio-types' },
] as const;

type MasterType = (typeof masterTabs)[number]['type'];

type MasterItem = {
  id: string;
  name: string;
  type: MasterType;
};

export default function AdminMastersPage() {
  const [activeType, setActiveType] = useState<MasterType>('body-parts');
  const [items, setItems] = useState<MasterItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const activeLabel = useMemo(
    () => masterTabs.find((tab) => tab.type === activeType)?.label ?? '',
    [activeType],
  );

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setStatusMessage('');
      const res = await fetch(`/api/masters?type=${activeType}`);
      if (!res.ok) {
        setStatusMessage('取得に失敗しました。');
        setLoading(false);
        return;
      }
      const data = (await res.json()) as MasterItem[];
      setItems(data);
      setLoading(false);
    };

    void fetchItems();
  }, [activeType]);

  const handleAdd = async () => {
    const name = inputValue.trim();
    if (!name) return;
    setStatusMessage('');
    const res = await fetch(`/api/masters?type=${activeType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (res.status === 409) {
      setStatusMessage('同じ名称が既に存在します。');
      return;
    }

    if (!res.ok) {
      setStatusMessage('追加に失敗しました。');
      return;
    }

    const created = (await res.json()) as MasterItem;
    setItems((prev) => [created, ...prev]);
    setInputValue('');
  };

  const handleEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setEditingValue(item.name);
  };

  const handleSave = async (id: string) => {
    const name = editingValue.trim();
    if (!name) return;
    const res = await fetch(`/api/masters/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      setStatusMessage('更新に失敗しました。');
      return;
    }

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));
    setEditingId(null);
    setEditingValue('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この項目を削除します。よろしいですか？')) return;
    const res = await fetch(`/api/masters/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      setStatusMessage('削除に失敗しました。');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="マスター管理"
        subtitle="Master settings"
        maxWidth="4xl"
        action={
          <Link href="/admin" className={buttonClasses('outline')}>
            管理者メニューへ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="flex flex-wrap gap-3">
          {masterTabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveType(tab.type)}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${
                activeType === tab.type
                  ? 'border-[color:var(--accent)] text-[color:var(--accent)]'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="mt-8 p-6 md:p-8">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {activeLabel}を追加
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="新しい項目を追加"
              className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
            <button
              type="button"
              className={`${buttonClasses('pink')} flex items-center gap-2`}
              onClick={handleAdd}
            >
              <Plus size={16} />
              追加
            </button>
          </div>
        </Card>

        {statusMessage ? (
          <p className="mt-4 text-sm font-bold text-red-500">{statusMessage}</p>
        ) : null}

        {loading ? (
          <Card className="mt-6 p-6 text-sm font-bold text-gray-500">読み込み中...</Card>
        ) : (
          <section className="mt-6 grid gap-3">
            {items.map((item) => (
              <Card key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400">名称</p>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold"
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                      />
                    ) : (
                      <p className="font-bold text-gray-900">{item.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingId === item.id ? (
                      <>
                        <button
                          type="button"
                          className={`${buttonClasses('pink')} flex items-center gap-1`}
                          onClick={() => handleSave(item.id)}
                        >
                          <Save size={14} />
                          保存
                        </button>
                        <button
                          type="button"
                          className={buttonClasses('outline')}
                          onClick={() => {
                            setEditingId(null);
                            setEditingValue('');
                          }}
                        >
                          <X size={14} />
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={buttonClasses('outline')}
                          onClick={() => handleEdit(item)}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          className={`${buttonClasses('danger')} flex items-center gap-1`}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={14} />
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
