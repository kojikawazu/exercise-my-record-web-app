import { LoaderCircle } from 'lucide-react';

type LoadingMode = 'fetching' | 'saving' | 'deleting' | 'exporting' | 'auth';
type LoadingVariant = 'block' | 'inline';

type LoadingSpinnerProps = {
  mode?: LoadingMode;
  label?: string;
  variant?: LoadingVariant;
  className?: string;
};

const modeLabels: Record<LoadingMode, string> = {
  fetching: '読み込み中...',
  saving: '保存中...',
  deleting: '削除中...',
  exporting: 'エクスポート中...',
  auth: 'ログイン中...',
};

const modeClasses: Record<LoadingMode, string> = {
  fetching: 'text-gray-500',
  saving: 'text-emerald-600',
  deleting: 'text-rose-600',
  exporting: 'text-sky-600',
  auth: 'text-amber-600',
};

const variantClasses: Record<LoadingVariant, string> = {
  block: 'flex items-center justify-center gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold',
  inline: 'inline-flex items-center gap-2 text-sm font-bold',
};

export default function LoadingSpinner({
  mode = 'fetching',
  label,
  variant = 'block',
  className = '',
}: LoadingSpinnerProps) {
  const text = label ?? modeLabels[mode];
  const iconSize = variant === 'inline' ? 14 : 18;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`${variantClasses[variant]} ${modeClasses[mode]} ${className}`}
    >
      <LoaderCircle size={iconSize} className="animate-spin" />
      {text}
    </span>
  );
}
