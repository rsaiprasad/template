import { WithPermission } from '@/components/features/permission-gate';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  permission: string;
  onDelete: () => void;
}

export function BulkActionBar({ selectedCount, permission, onDelete }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 rounded-md border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <WithPermission permission={permission}>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Selected
        </Button>
      </WithPermission>
    </div>
  );
}
