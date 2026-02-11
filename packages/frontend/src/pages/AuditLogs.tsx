import { api } from '@/api';
import type { AuditLog } from '@/api';
import { PageHeader } from '@/components/features/page-header';
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
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { queryKeys } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Clock, FileText, Filter, User } from 'lucide-react';
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
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_UPDATED', label: 'User Updated' },
  { value: 'USER_DISABLED', label: 'User Disabled' },
  { value: 'USER_ENABLED', label: 'User Enabled' },
  { value: 'USER_DELETED', label: 'User Deleted' },
  { value: 'USER_GROUP_ADDED', label: 'User Group Added' },
  { value: 'USER_GROUP_REMOVED', label: 'User Group Removed' },
  { value: 'GROUP_CREATED', label: 'Group Created' },
  { value: 'GROUP_UPDATED', label: 'Group Updated' },
  { value: 'GROUP_DELETED', label: 'Group Deleted' },
  { value: 'GROUP_PERMISSIONS_CHANGED', label: 'Group Permissions Changed' },
  { value: 'SETTINGS_UPDATED', label: 'Settings Updated' },
];

const RESOURCE_TYPES = [
  { value: 'users', label: 'Users' },
  { value: 'groups', label: 'Groups' },
  { value: 'settings', label: 'Settings' },
  { value: 'auth', label: 'Auth' },
];

function getActionBadgeVariant(action: string) {
  if (action.endsWith('_CREATED')) return 'success';
  if (action.endsWith('_DELETED')) return 'destructive';
  if (action === 'LOGIN_FAILED') return 'destructive';
  if (action === 'USER_DISABLED') return 'warning';
  if (
    action.endsWith('_UPDATED') ||
    action.endsWith('_CHANGED') ||
    action.endsWith('_ENABLED') ||
    action.endsWith('_ADDED') ||
    action.endsWith('_REMOVED')
  )
    return 'default';
  if (action === 'LOGIN' || action === 'LOGOUT') return 'secondary';
  if (action === 'SETTINGS_UPDATED') return 'info';
  return 'outline';
}

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTodayDateString(): string {
  return formatDateString(new Date());
}

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateString(tomorrow);
}

export function AuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);

  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  // Parse search params
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') || '20', 10);
  const actorId = searchParams.get('actorId') || '';
  const action = searchParams.get('action') || '';
  const resource = searchParams.get('resource') || '';
  const startDate = searchParams.get('startDate') || today;
  const endDate = searchParams.get('endDate') || tomorrow;

  // Convert date strings to ISO for API
  const startDateISO = React.useMemo(() => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [startDate]);

  const endDateISO = React.useMemo(() => {
    const d = new Date(endDate);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [endDate]);

  // Fetch audit logs
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.auditLogs.list({
      page,
      pageSize,
      actorId: actorId || undefined,
      action: action || undefined,
      resource: resource || undefined,
      startDate: startDateISO,
      endDate: endDateISO,
    }),
    queryFn: () =>
      api.listAuditLogs({
        page,
        pageSize,
        actorId: actorId || undefined,
        action: action || undefined,
        resource: resource || undefined,
        startDate: startDateISO,
        endDate: endDateISO,
      }),
  });

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
    setSearchParams(new URLSearchParams());
  };

  const hasFilters = actorId || action || resource || startDate !== today || endDate !== tomorrow;
  const totalPages = data ? Math.ceil(data.meta.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Audit Logs"
        description="View all actions and changes made in the system."
      />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Date range row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="w-full sm:w-[180px] space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is a wrapper around native input */}
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  aria-label="Start Date"
                />
              </div>

              <div className="w-full sm:w-[180px] space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is a wrapper around native input */}
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  aria-label="End Date"
                />
              </div>
            </div>

            {/* Other filters row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is a wrapper around native input */}
                <label className="text-sm font-medium">Actor ID</label>
                <Input
                  placeholder="Filter by actor ID..."
                  value={actorId}
                  onChange={(e) => handleFilterChange('actorId', e.target.value)}
                  aria-label="Actor ID"
                />
              </div>

              <div className="w-full sm:w-[220px] space-y-2">
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is a wrapper around native input */}
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
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Select is a custom component */}
                <label className="text-sm font-medium">Resource</label>
                <Select
                  value={resource || 'all'}
                  onValueChange={(value) => handleFilterChange('resource', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All resources</SelectItem>
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
              <TableHead>Description</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-destructive">Failed to load audit logs</p>
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
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
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{formatDateTime(log.timestamp)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {formatActionLabel(log.action)}
                    </Badge>
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
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm">{log.actorEmail || log.actorName || 'System'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {log.description || '-'}
                    </p>
                  </TableCell>
                  <TableCell>
                    {log.changes && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        View
                      </Button>
                    )}
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
                    {formatActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resource</p>
                  <p className="text-sm">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resource ID</p>
                  <p className="text-sm font-mono">{selectedLog.resourceId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User</p>
                  <p className="text-sm">
                    {selectedLog.actorEmail || selectedLog.actorName || 'System'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Actor ID</p>
                  <p className="text-sm font-mono">{selectedLog.actorId || '-'}</p>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                    <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>
              {selectedLog.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedLog.description}</p>
                </div>
              )}
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
