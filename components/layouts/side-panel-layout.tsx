import type { ReactNode } from 'react';

interface SidePanelLayoutProps {
  children: ReactNode;
}

export function SidePanelLayout({ children }: SidePanelLayoutProps) {
  return (
    <div className='w-full max-w-2xl mx-auto h-full flex flex-col overflow-hidden bg-background text-foreground'>
      {children}
    </div>
  );
}
