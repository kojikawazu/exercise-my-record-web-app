'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEK_LABELS } from '@/constants/calendar';
import { buildMonthCells } from '@/lib/calendar';
import { toLocalIso } from '@/lib/date';

/** {@link DatePicker} の props。 */
type DatePickerProps = {
  /** 現在選択中の日付（`YYYY-MM-DD` 形式。空文字は未選択）。 */
  value: string;
  /** 日付選択時に `YYYY-MM-DD` 形式の文字列を渡すコールバック。 */
  onChange: (value: string) => void;
  /** 未選択時に表示するプレースホルダー（既定は「日付を選択」）。 */
  placeholder?: string;
  /** `true` で操作を無効化する。 */
  disabled?: boolean;
};

/**
 * `YYYY-MM-DD` 文字列を Date へパースする。
 *
 * @param value - 日付文字列（空文字・不正値は `null`）
 * @returns 解釈できた場合は Date、それ以外は `null`
 */
const parseDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

/**
 * 年ジャンプ対応の月間カレンダー型日付ピッカー。
 *
 * ボタン押下でカレンダーを開閉し、年・月をセレクトで切り替えて日付を選択する。選択結果は
 * `YYYY-MM-DD`（ローカルタイム基準）で `onChange` に渡す。props の各項目は
 * {@link DatePickerProps} を参照。
 */
export default function DatePicker({
  value,
  onChange,
  placeholder = '日付を選択',
  disabled = false,
}: DatePickerProps) {
  const selectedDate = parseDate(value);
  const base = selectedDate ?? new Date();

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth());

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, idx) => current - 10 + idx);
  }, []);

  const monthLabel = `${month + 1}月`;
  const calendar = useMemo(() => buildMonthCells(year, month), [year, month]);

  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const handleSelect = (day: number) => {
    const selected = new Date(year, month, day);
    onChange(toLocalIso(selected));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl bg-surface-muted px-4 py-3 text-sm font-bold text-muted"
      >
        <span>{value || placeholder}</span>
        <span className="text-xs font-bold text-subtle">Year jump</span>
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-20 mt-2 w-full rounded-2xl border border-line bg-surface p-4 shadow-lg"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-full border border-line p-2 text-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-lg border border-line px-2 py-1 text-sm font-bold text-muted"
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}年
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="rounded-lg border border-line px-2 py-1 text-sm font-bold text-muted"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx} value={idx}>
                    {idx + 1}月
                  </option>
                ))}
              </select>
              <span className="text-xs font-bold text-subtle">{monthLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-full border border-line p-2 text-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-subtle">
            {WEEK_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center">
            {calendar.map((day, idx) =>
              day ? (
                <button
                  key={`${year}-${month}-${day}-${idx}`}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleSelect(day);
                  }}
                  className="rounded-lg px-2 py-2 text-sm font-bold text-muted hover:bg-surface-muted"
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${idx}`} />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
