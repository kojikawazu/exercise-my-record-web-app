/**
 * ボタンの見た目バリアント。
 * cta=主要な操作（保存・記録追加・ログイン）/ primary=選択中の状態（期間の切替等）/
 * outline=枠線（遷移・補助操作）/ danger=削除系。
 */
export type ButtonVariant = 'cta' | 'primary' | 'outline' | 'danger';

const base = 'rounded-full px-4 py-2 text-sm font-bold transition inline-flex items-center gap-2';

const variants: Record<ButtonVariant, string> = {
  cta: 'bg-cta text-cta-foreground shadow-lg hover:bg-cta-hover',
  primary: 'bg-primary-fill text-white shadow-lg hover:bg-primary-fill-hover',
  outline:
    'border border-primary text-primary hover:bg-primary-fill hover:border-primary-fill hover:text-white',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-surface',
};

/**
 * バリアントに対応した Tailwind クラス文字列を組み立てる。
 *
 * `<Link>` や `<button>` などの要素へ共通の見た目を当てるときに利用する。
 *
 * @param variant - 適用する見た目バリアント（既定は `primary`）
 * @returns 共通クラスとバリアント別クラスを連結した文字列
 */
export const buttonClasses = (variant: ButtonVariant = 'primary') => `${base} ${variants[variant]}`;
