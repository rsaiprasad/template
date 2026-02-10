import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type * as React from 'react';

interface MetadataItem {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}

interface MetadataCardProps {
  title: string;
  items: MetadataItem[];
}

export function MetadataCard({ title, items }: MetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={Icon ? 'flex items-center gap-3 text-sm' : 'text-sm'}>
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="font-medium">{item.label}</p>
                <p
                  className={`text-muted-foreground ${item.mono ? 'font-mono text-xs break-all' : ''}`}
                >
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
