/** ボタンの見た目バリアント。primary=主要操作 / outline=枠線 / pink=強調追加 / danger=削除系。 */
export type ButtonVariant = 'primary' | 'outline' | 'pink' | 'danger';

const base = 'rounded-full px-4 py-2 text-sm font-bold transition inline-flex items-center gap-2';

const variants: Record<ButtonVariant, string> = {
  primary: 'af-button shadow-lg',
  outline:
    'border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white',
  pink: 'bg-[color:var(--accent-pink)] text-white shadow-lg shadow-pink-100 hover:opacity-90',
  danger: 'border border-[#a94040] text-[#a94040] hover:bg-[#a94040] hover:text-white',
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
