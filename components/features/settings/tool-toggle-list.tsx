import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ToolMeta } from '@/lib/agent/tools/tool-meta';

interface ToolToggleListProps {
  tools: ToolMeta[];
  enabledTools: string[];
  title: string;
  icon: React.ReactNode;
  onToggle: (toolName: string, enabled: boolean) => void;
}

export function ToolToggleList({ tools, enabledTools, title, icon, onToggle }: ToolToggleListProps) {
  return (
    <div>
      <h2 className='text-lg font-semibold tracking-tight flex items-center gap-2 mb-4'>
        {icon}
        {title}
      </h2>
      <Card className='py-2'>
        <div className='divide-y'>
          {tools.map((tool) => (
            <div key={tool.name} className='flex items-center justify-between p-4 bg-card text-card-foreground'>
              <div className='space-y-1'>
                <Label className='text-sm font-medium' htmlFor={`tool-${tool.name}`}>
                  {tool.label} <span className='text-xs text-muted-foreground font-normal'>({tool.name})</span>
                </Label>
                <p className='text-xs text-muted-foreground'>{tool.description}</p>
              </div>
              <Switch
                checked={enabledTools.includes(tool.name)}
                id={`tool-${tool.name}`}
                onCheckedChange={(checked) => onToggle(tool.name, checked)}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
