'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Save, Trash2, X } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMasterList } from '@/hooks/useMasterList';
import { MASTER_TYPES, type MasterResponse, type MasterType } from '@/types/master';

/**
 * マスター種別ごとの表示ラベル。**表示は UI の関心事**のため、種別の定義
 * （`@/types/master`）とは分けてここに置く（`.claude/rules/frontend.md`「型の扱い」）。
 */
const MASTER_TYPE_LABELS: Record<MasterType, string> = {
  'body-parts': '部位',
  exercises: '種目',
  'cardio-types': '有酸素種別',
};

/** マスター管理画面のタブ定義。表示順は `MASTER_TYPES` の順序に従う。 */
const masterTabs = MASTER_TYPES.map((type) => ({
  type,
  label: MASTER_TYPE_LABELS[type],
}));

/**
 * マスター管理画面。部位・種目・有酸素種別のタブを切り替えて項目を一覧表示し、追加・
 * インライン編集・削除（確認ダイアログ付き）を行う。取得・追加・保存・削除は API 経由で、
 * 名称重複（409）や各操作の失敗はステータスメッセージで通知する。
 */
export default function AdminMastersClient() {
  const [activeType, setActiveType] = useState<MasterType>('body-parts');
  const { items, status: listStatus, add, rename, remove } = useMasterList(activeType);
  const [inputValue, setInputValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  // 追加・更新・削除の失敗メッセージ。タブを切り替えたら消す
  const [statusMessage, setStatusMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const loading = listStatus === 'loading';
  const message = statusMessage || (listStatus === 'error' ? '取得に失敗しました。' : '');

  const activeLabel = useMemo(
    () => masterTabs.find((tab) => tab.type === activeType)?.label ?? '',
    [activeType],
  );

  const selectType = (type: MasterType) => {
    setActiveType(type);
    setStatusMessage('');
  };

  const handleAdd = async () => {
    const name = inputValue.trim();
    if (!name) return;
    setStatusMessage('');
    setAdding(true);
    const result = await add(name);
    setAdding(false);

    if (!result.ok) {
      setStatusMessage(
        result.status === 409 ? '同じ名称が既に存在します。' : '追加に失敗しました。',
      );
      return;
    }
    setInputValue('');
  };

  const handleEdit = (item: MasterResponse) => {
    setEditingId(item.id);
    setEditingValue(item.name);
  };

  const handleSave = async (id: string) => {
    const name = editingValue.trim();
    if (!name) return;
    setSavingId(id);
    const result = await rename(id, name);
    setSavingId(null);

    if (!result.ok) {
      setStatusMessage('更新に失敗しました。');
      return;
    }
    setEditingId(null);
    setEditingValue('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この項目を削除します。よろしいですか？')) return;
    setDeletingId(id);
    const result = await remove(id);
    setDeletingId(null);
    if (!result.ok) setStatusMessage('削除に失敗しました。');
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
              onClick={() => selectType(tab.type)}
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
              disabled={adding}
            >
              {adding ? (
                <LoadingSpinner mode="saving" variant="inline" className="text-white" />
              ) : (
                <>
                  <Plus size={16} />
                  追加
                </>
              )}
            </button>
          </div>
        </Card>

        {message ? <p className="mt-4 text-sm font-bold text-red-500">{message}</p> : null}

        {loading ? (
          <Card className="mt-6 p-6">
            <LoadingSpinner mode="fetching" />
          </Card>
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
                          disabled={savingId === item.id}
                        >
                          {savingId === item.id ? (
                            <LoadingSpinner mode="saving" variant="inline" className="text-white" />
                          ) : (
                            <>
                              <Save size={14} />
                              保存
                            </>
                          )}
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
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? (
                            <LoadingSpinner
                              mode="deleting"
                              variant="inline"
                              className="text-inherit"
                            />
                          ) : (
                            <>
                              <Trash2 size={14} />
                              削除
                            </>
                          )}
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
