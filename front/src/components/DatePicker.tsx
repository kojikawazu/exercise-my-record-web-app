'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const buildCalendar = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = first.getDay();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  return cells;
};

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
  const calendar = useMemo(() => buildCalendar(year, month), [year, month]);

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
        className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500"
      >
        <span>{value || placeholder}</span>
        <span className="text-xs font-bold text-gray-400">Year jump</span>
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-20 mt-2 w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-full border border-gray-200 p-2 text-gray-500"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-600"
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
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-bold text-gray-600"
              >
                {Array.from({ length: 12 }, (_, idx) => (
                  <option key={idx} value={idx}>
                    {idx + 1}月
                  </option>
                ))}
              </select>
              <span className="text-xs font-bold text-gray-400">{monthLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-full border border-gray-200 p-2 text-gray-500"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400">
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
                  className="rounded-lg px-2 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
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
