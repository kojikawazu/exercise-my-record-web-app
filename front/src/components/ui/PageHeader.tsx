import type { ReactNode } from 'react';

const widthMap = {
  xl: 'max-w-xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

/** {@link PageHeader} の props。 */
type PageHeaderProps = {
  /** 見出し（大きく表示するページタイトル）。 */
  title: string;
  /** 小さく上部に表示する補助ラベル（英語表記など）。省略時は非表示。 */
  subtitle?: string;
  /** 右側に配置するアクション要素（ボタンやリンク）。 */
  action?: ReactNode;
  /** 中央寄せコンテンツの最大幅キー（既定は `5xl`）。 */
  maxWidth?: keyof typeof widthMap;
};

/**
 * ページ上部に固定表示するヘッダー。タイトル・補助ラベル・右側アクションを配置する。
 * props の各項目は {@link PageHeaderProps} を参照。
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  maxWidth = '5xl',
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b bg-white/80 px-6 py-4 backdrop-blur">
      <div className={`mx-auto flex ${widthMap[maxWidth]} flex-wrap items-center justify-between gap-4`}>
        <div>
          {subtitle ? (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-2xl font-black tracking-tight text-[color:var(--accent)]">
            {title}
          </h1>
        </div>
        {action}
      </div>
    </div>
  );
}
