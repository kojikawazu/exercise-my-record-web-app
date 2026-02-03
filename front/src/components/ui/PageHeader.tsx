import type { ReactNode } from 'react';

const widthMap = {
  xl: 'max-w-xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  maxWidth?: keyof typeof widthMap;
};

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
