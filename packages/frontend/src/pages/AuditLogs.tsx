import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { auditLogApi } from '@/lib/api';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { queryKeys } from '@/types';
import type { AuditLog } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, FileText, Filter, Search, User } from 'lucide-react';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Safe JSON display component that properly escapes user content
 * Prevents XSS by using React's built-in escaping via textContent
 */
function SafeJsonDisplay({ data }: { data: unknown }) {
  const formattedJson = React.useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return 'Unable to display data';
    }
  }, [data]);

  return (
    <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap break-words">
      <code>{formattedJson}</code>
    </pre>
  );
}

const PAGE_SIZES = [10, 20, 50, 100];

const ACTIONS = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
];

const RESOURCE_TYPES = [
  { value: 'user', label: 'User' },
  { value: 'group', label: 'Group' },
  { value: 'permission', label: 'Permission' },
];

function getActionBadgeVariant(action: string) {
  switch (action.toLowerCase()) {
    case 'create':
      return 'success';
    case 'delete':
      return 'destructive';
    case 'update':
      return 'default';
    case 'login':
    case 'logout':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  // Parse search params
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') || '20', 10);
  const userId = searchParams.get('userId') || '';
  const action = searchParams.get('action') || '';
  const resourceType = searchParams.get('resourceType') || '';

  // Local state
  const [userIdInput, setUserIdInput] = React.useState(userId);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch audit logs
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.auditLogs.list({
      page,
      pageSize,
      userId: userId || undefined,
      action: action || undefined,
      resourceType: resourceType || undefined,
    }),
    queryFn: () =>
      auditLogApi.listAuditLogs({
        page,
        pageSize,
        userId: userId || undefined,
        action: action || undefined,
        resourceType: resourceType || undefined,
      }),
  });

  // Debounced user ID search with proper cleanup
  const debouncedUserIdSearch = React.useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams);
        if (value) {
          params.set('userId', value);
        } else {
          params.delete('userId');
        }
        params.set('page', '1');
        setSearchParams(params);
      }, 300);
    },
    [searchParams, setSearchParams]
  );

  // Cleanup debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserIdInput(e.target.value);
    debouncedUserIdSearch(e.target.value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const handlePageSizeChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('pageSize', value);
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setUserIdInput('');
    setSearchParams(new URLSearchParams());
  };

  const hasFilters = userId || action || resourceType;
  const totalPages = data ? Math.ceil(data.meta.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">View all actions and changes made in the system.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by user ID..."
                  value={userIdInput}
                  onChange={handleUserIdChange}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full sm:w-[180px] space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={action || 'all'}
                onValueChange={(value) => handleFilterChange('action', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[180px] space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select
                value={resourceType || 'all'}
                onValueChange={(value) => handleFilterChange('resourceType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {RESOURCE_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-destructive">Failed to load audit logs</p>
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No audit logs found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((log: AuditLog) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{formatDateTime(log.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.resource}</Badge>
                      {log.resourceId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {log.resourceId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">
                        {log.actorId?.slice(0, 8) || 'System'}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.meta.total > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size: number) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>of {data.meta.total} entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>Complete information about this audit event</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm">{formatDateTime(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Action</p>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resource Type</p>
                  <p className="text-sm">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resource ID</p>
                  <p className="text-sm font-mono">{selectedLog.resourceId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Actor ID</p>
                  <p className="text-sm font-mono">{selectedLog.actorId || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                  <p className="text-sm font-mono">{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>
              {selectedLog.changes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Changes</p>
                  <SafeJsonDisplay data={selectedLog.changes} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuditLogs;
