import { WithPermission } from '@/components/features/permission-gate';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ListHeaderProps {
  title: string;
  description: string;
  permission: string;
  buttonLabel: string;
  buttonHref: string;
}

export function ListHeader({
  title,
  description,
  permission,
  buttonLabel,
  buttonHref,
}: ListHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <WithPermission permission={permission}>
        <Button asChild>
          <Link to={buttonHref}>
            <Plus className="mr-2 h-4 w-4" />
            {buttonLabel}
          </Link>
        </Button>
      </WithPermission>
    </div>
  );
}
