import { api } from '@/api';
import { BulkActionBar } from '@/components/features/bulk-action-bar';
import { DeleteConfirmationDialog } from '@/components/features/delete-confirmation-dialog';
import { PageHeader } from '@/components/features/page-header';
import { WithPermission } from '@/components/features/permission-gate';
import { SearchFilterBar } from '@/components/features/search-filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { formatDate, getInitials } from '@/lib/utils';
import { queryKeys } from '@/types';
import type { UserWithGroups } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, PaginationState, RowSelectionState } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'disabled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getColumns(
  onDeleteClick: (user: UserWithGroups) => void
): ColumnDef<UserWithGroups, unknown>[] {
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
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'displayName',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
            </Avatar>
            <Link to={`/users/${user.id}`} className="font-medium hover:underline">
              {user.displayName || 'No name'}
            </Link>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)}>{row.original.status}</Badge>
      ),
    },
    {
      id: 'group',
      header: 'Groups',
      cell: ({ row }) => {
        const groupNames = row.original.groupNames;
        if (!groupNames || groupNames.length === 0) {
          return <Badge variant="outline">None</Badge>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {groupNames.map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
        );
      },
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
        const user = row.original;
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
                <Link to={`/users/${user.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <WithPermission permission="users:delete">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteClick(user)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </WithPermission>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function UserList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Parse search params
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const groupId = searchParams.get('groupId') || '';

  // Debounced search
  const { inputValue: searchInput, handleChange: handleSearchChange } = useDebouncedSearch();

  // Selection state
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Reset selection when page/search/status/group changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on filter change
  React.useEffect(() => {
    setRowSelection({});
  }, [page, pageSize, search, status, groupId]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<'bulk' | UserWithGroups>('bulk');

  // Fetch groups for filter dropdown
  const { data: groupsData } = useQuery({
    queryKey: queryKeys.groups.list({ pageSize: 100 }),
    queryFn: () => api.listGroups({ pageSize: 100 }),
  });

  const groups = (groupsData?.data as Array<{ id: string; name: string }>) ?? [];

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.users.list({ page, pageSize, search, status, groupId }),
    queryFn: () =>
      api.listUsers({
        page,
        pageSize,
        search,
        status: status || undefined,
        groupId: groupId || undefined,
      }),
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

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('status', value);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleGroupChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('groupId', value);
    } else {
      params.delete('groupId');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDeleteClick = React.useCallback((user: UserWithGroups) => {
    setDeleteTarget(user);
    setDeleteDialogOpen(true);
  }, []);

  const handleBulkDeleteClick = () => {
    setDeleteTarget('bulk');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);

    if (deleteTarget === 'bulk') {
      const selectedIds = Object.keys(rowSelection);
      const results = await Promise.allSettled(selectedIds.map((id) => api.deleteUser(id)));
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length === 0) {
        toastSuccess('Users deleted', `${selectedIds.length} user(s) deleted successfully.`);
      } else if (failures.length < selectedIds.length) {
        toastError(
          'Partial failure',
          `${selectedIds.length - failures.length} deleted, ${failures.length} failed.`
        );
      } else {
        toastError('Failed to delete users', 'All delete operations failed.');
      }
      setRowSelection({});
    } else {
      try {
        await api.deleteUser(deleteTarget.id);
        toastSuccess('User deleted', 'The user has been successfully deleted.');
      } catch (err) {
        toastError('Failed to delete user', err instanceof Error ? err.message : 'Unknown error');
      }
    }

    setIsDeleting(false);
    setDeleteDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const columns = React.useMemo(() => getColumns(handleDeleteClick), [handleDeleteClick]);

  const deleteDialogTitle = deleteTarget === 'bulk' ? 'Delete Users' : 'Delete User';
  const deleteDialogDescription =
    deleteTarget === 'bulk'
      ? `Are you sure you want to delete ${selectedCount} user(s)? This action cannot be undone.`
      : `Are you sure you want to delete ${deleteTarget.displayName || deleteTarget.email}? This action cannot be undone.`;
  const deleteButtonLabel = deleteTarget === 'bulk' ? `Delete ${selectedCount} User(s)` : 'Delete';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Users" description="Manage user accounts and their permissions." />

      {/* Filters */}
      <SearchFilterBar
        placeholder="Search users..."
        value={searchInput}
        onChange={handleSearchChange}
      >
        <Select value={status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={groupId || 'all'} onValueChange={handleGroupChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SearchFilterBar>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedCount}
        permission="users:delete"
        onDelete={handleBulkDeleteClick}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={(data?.data as UserWithGroups[]) ?? []}
        isLoading={isLoading}
        error={error}
        errorMessage="Failed to load users"
        emptyMessage="No users found"
        rowCount={data?.meta?.total ?? 0}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={(row) => row.id}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={deleteDialogTitle}
        description={deleteDialogDescription}
        confirmLabel={deleteButtonLabel}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default UserList;
