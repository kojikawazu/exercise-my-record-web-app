import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'pink' | 'danger';

const base = 'rounded-full px-4 py-2 text-sm font-bold transition inline-flex items-center gap-2';

const variants: Record<ButtonVariant, string> = {
  primary: 'af-button shadow-lg',
  outline: 'border border-[color:var(--accent)] text-[color:var(--accent)] hover:bg-[color:var(--accent)] hover:text-white',
  pink: 'bg-[color:var(--accent-pink)] text-white shadow-lg shadow-pink-100 hover:opacity-90',
  danger: 'border border-[#a94040] text-[#a94040] hover:bg-[#a94040] hover:text-white',
};

export const buttonClasses = (variant: ButtonVariant = 'primary') =>
  `${base} ${variants[variant]}`;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({ className = '', variant = 'primary', ...props }: ButtonProps) {
  return <button className={`${buttonClasses(variant)} ${className}`} {...props} />;
}
