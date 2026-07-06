import { LoaderCircle } from 'lucide-react';

/** 処理種別。既定ラベルと文字色を切り替えるためのキー。 */
type LoadingMode = 'fetching' | 'saving' | 'deleting' | 'exporting' | 'auth';
/** 表示形態。block=独立ブロック / inline=行内（ボタン内など）。 */
type LoadingVariant = 'block' | 'inline';

/** {@link LoadingSpinner} の props。 */
type LoadingSpinnerProps = {
  /** 処理種別。既定ラベル・色を決める（既定は `fetching`）。 */
  mode?: LoadingMode;
  /** 表示テキストの明示指定。指定時は `mode` の既定ラベルより優先される。 */
  label?: string;
  /** 表示形態。アイコンサイズと外枠スタイルを決める（既定は `block`）。 */
  variant?: LoadingVariant;
  /** 追加の Tailwind クラス。 */
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

/**
 * 回転アイコン付きのローディング表示。処理種別ごとに色とラベルを変える。
 *
 * `role="status"` / `aria-live="polite"` を付与し、状態変化をスクリーンリーダーへ通知する。
 * props の各項目は {@link LoadingSpinnerProps} を参照。
 */
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
