import type { ButtonHTMLAttributes } from 'react';

/** ボタンの見た目バリアント。primary=主要操作 / outline=枠線 / pink=強調追加 / danger=削除系。 */
export type ButtonVariant = 'primary' | 'outline' | 'pink' | 'danger';

const base = 'rounded-full px-4 py-2 text-sm font-bold transition inline-flex items-center gap-2';

const variants: Record<ButtonVariant, string> = {
  primary: 'af-button shadow-lg',
  outline: 'border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white',
  pink: 'bg-[color:var(--accent-pink)] text-white shadow-lg shadow-pink-100 hover:opacity-90',
  danger: 'border border-[#a94040] text-[#a94040] hover:bg-[#a94040] hover:text-white',
};

/**
 * バリアントに対応した Tailwind クラス文字列を組み立てる。
 *
 * `<Button>` を使わず `<Link>` や素の要素へ同じ見た目を当てたいときに利用する。
 *
 * @param variant - 適用する見た目バリアント（既定は `primary`）
 * @returns 共通クラスとバリアント別クラスを連結した文字列
 */
export const buttonClasses = (variant: ButtonVariant = 'primary') =>
  `${base} ${variants[variant]}`;

/** {@link Button} の props。標準の button 属性に見た目バリアントを加えたもの。 */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 適用する見た目バリアント（既定は `primary`）。 */
  variant?: ButtonVariant;
};

/**
 * 共通スタイルを当てた汎用ボタン。バリアントと任意の追加クラスを合成する。
 *
 * props は button 標準属性に加え {@link ButtonProps} の `variant` を受け取る
 * （`className` は共通スタイルへ追記される）。
 */
export default function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...props} />;
}
