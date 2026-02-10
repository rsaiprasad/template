import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type * as React from 'react';

interface SearchFilterBarProps {
  placeholder: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  children?: React.ReactNode;
}

export function SearchFilterBar({ placeholder, value, onChange, children }: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={placeholder} value={value} onChange={onChange} className="pl-9" />
      </div>
      {children}
    </div>
  );
}
