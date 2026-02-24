import type { ReactNode } from 'react';

interface SidePanelHeaderProps {
  title: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
}

export function SidePanelHeader({ title, leftActions, rightActions }: SidePanelHeaderProps) {
  return (
    <div className='flex items-center justify-between px-3 border-b h-12 shrink-0 bg-background z-10'>
      <div className='flex items-center gap-1 shrink-0'>{leftActions}</div>
      <h1 className='text-sm font-semibold truncate text-center flex-1 mx-2'>{title}</h1>
      <div className='flex items-center gap-1 shrink-0'>{rightActions}</div>
    </div>
  );
}
