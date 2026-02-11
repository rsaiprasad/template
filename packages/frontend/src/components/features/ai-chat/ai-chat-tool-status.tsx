import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

interface AiChatToolStatusProps {
  name: string;
  status: 'calling' | 'done' | 'error';
}

const FRIENDLY_NAMES: Record<string, string> = {
  listUsers: 'Looking up users',
  getUser: 'Fetching user details',
  updateUser: 'Updating user',
  listGroups: 'Looking up groups',
  getGroup: 'Fetching group details',
  createGroup: 'Creating group',
  updateGroup: 'Updating group',
  deleteGroup: 'Deleting group',
  listAuditLogs: 'Checking audit logs',
  getPermissions: 'Fetching permissions',
};

function getFriendlyName(name: string): string {
  return FRIENDLY_NAMES[name] ?? name.replace(/([A-Z])/g, ' $1').trim();
}

export function AiChatToolStatus({ name, status }: AiChatToolStatusProps) {
  const friendlyName = getFriendlyName(name);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs',
        'bg-muted/50 text-muted-foreground'
      )}
    >
      {status === 'calling' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'done' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
      {status === 'error' && <XCircle className="h-3 w-3 text-destructive" />}
      <span>
        {friendlyName}
        {status === 'calling' && '...'}
      </span>
    </div>
  );
}
