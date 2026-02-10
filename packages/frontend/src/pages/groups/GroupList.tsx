import { api } from '@/api';
import { WithPermission } from '@/components/features/permission-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';
import { queryKeys } from '@/types';
import type { GroupWithUsers } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, PaginationState, RowSelectionState } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function getColumns(
  onDeleteClick: (group: GroupWithUsers) => void
): ColumnDef<GroupWithUsers, unknown>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          disabled={!row.getCanSelect()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Group',
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <Link to={`/groups/${group.id}`} className="font-medium hover:underline">
              {group.name}
            </Link>
            {group.isSystem && (
              <Badge variant="outline" className="text-xs">
                System
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[200px] truncate block">
          {row.original.description || '-'}
        </span>
      ),
    },
    {
      id: 'members',
      header: 'Members',
      cell: ({ row }) => (
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {row.original.userCount || 0}
        </Badge>
      ),
    },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.permissions?.length || 0} permissions</Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const group = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/groups/${group.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {!group.isSystem && (
                <WithPermission permission="groups:delete">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteClick(group)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </WithPermission>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function GroupList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Parse search params
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';

  // Debounced search
  const { inputValue: searchInput, handleChange: handleSearchChange } = useDebouncedSearch();

  // Selection state
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Reset selection when page/search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on filter change
  React.useEffect(() => {
    setRowSelection({});
  }, [page, pageSize, search]);

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<'bulk' | GroupWithUsers>('bulk');

  // Fetch groups
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.groups.list({ page, pageSize, search }),
    queryFn: () => api.listGroups({ page, pageSize, search }),
  });

  const selectedCount = Object.keys(rowSelection).length;

  // Pagination state bridged to URL params
  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  };

  const handlePaginationChange = React.useCallback(
    (updaterOrValue: PaginationState | ((old: PaginationState) => PaginationState)) => {
      const newPagination =
        typeof updaterOrValue === 'function'
          ? updaterOrValue({ pageIndex: page - 1, pageSize })
          : updaterOrValue;
      const params = new URLSearchParams(searchParams);
      params.set('page', (newPagination.pageIndex + 1).toString());
      params.set('pageSize', newPagination.pageSize.toString());
      setSearchParams(params);
    },
    [page, pageSize, searchParams, setSearchParams]
  );

  const handleDeleteClick = React.useCallback((group: GroupWithUsers) => {
    setDeleteTarget(group);
    setDeleteDialogOpen(true);
  }, []);

  const handleBulkDeleteClick = () => {
    setDeleteTarget('bulk');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);

    if (deleteTarget === 'bulk') {
      const allGroups = (data?.data as GroupWithUsers[]) ?? [];
      const selectedIds = Object.keys(rowSelection).filter((id) => {
        const group = allGroups.find((g) => g.id === id);
        return group && !group.isSystem;
      });
      if (selectedIds.length === 0) {
        toastError('Cannot delete', 'System groups cannot be deleted.');
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        return;
      }
      const results = await Promise.allSettled(selectedIds.map((id) => api.deleteGroup(id)));
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length === 0) {
        toastSuccess('Groups deleted', `${selectedIds.length} group(s) deleted successfully.`);
      } else if (failures.length < selectedIds.length) {
        toastError(
          'Partial failure',
          `${selectedIds.length - failures.length} deleted, ${failures.length} failed.`
        );
      } else {
        toastError('Failed to delete groups', 'All delete operations failed.');
      }
      setRowSelection({});
    } else {
      try {
        await api.deleteGroup(deleteTarget.id);
        toastSuccess('Group deleted', 'The group has been successfully deleted.');
      } catch (err) {
        toastError('Failed to delete group', err instanceof Error ? err.message : 'Unknown error');
      }
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  };

  const columns = React.useMemo(() => getColumns(handleDeleteClick), [handleDeleteClick]);

  const deleteDialogTitle = deleteTarget === 'bulk' ? 'Delete Groups' : 'Delete Group';
  const deleteDialogDescription =
    deleteTarget === 'bulk'
      ? `Are you sure you want to delete ${selectedCount} group(s)? This will remove all users from these groups. This action cannot be undone.`
      : `Are you sure you want to delete ${deleteTarget.name}? This will remove all users from this group. This action cannot be undone.`;
  const deleteButtonLabel = deleteTarget === 'bulk' ? `Delete ${selectedCount} Group(s)` : 'Delete';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Manage permission groups and their members.</p>
        </div>
        <WithPermission permission="groups:create">
          <Button asChild>
            <Link to="/groups/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Link>
          </Button>
        </WithPermission>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-4 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <WithPermission permission="groups:delete">
            <Button variant="destructive" size="sm" onClick={handleBulkDeleteClick}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </WithPermission>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={(data?.data as GroupWithUsers[]) ?? []}
        isLoading={isLoading}
        error={error}
        errorMessage="Failed to load groups"
        emptyMessage="No groups found"
        rowCount={data?.meta?.total ?? 0}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
        enableRowSelection={(row: GroupWithUsers) => !row.isSystem}
      />

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteDialogTitle}</DialogTitle>
            <DialogDescription>{deleteDialogDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} isLoading={isDeleting}>
              {deleteButtonLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GroupList;
