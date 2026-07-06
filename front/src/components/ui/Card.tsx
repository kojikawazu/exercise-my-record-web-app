import type { HTMLAttributes } from 'react';

/**
 * カード外観（角丸・影）の共通ラッパー div。任意の追加クラスを合成する。
 *
 * props は div 標準属性を受け取り、`className` は共通スタイルへ追記される。
 */
export default function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`af-card soft-shadow ${className}`} {...props} />;
}
