import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { api } from '@/api';
import { formatDateTime } from '@/lib/utils';
import { queryKeys } from '@/types';
import type { Group, Permission } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Save, Shield } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

interface PermissionDisplayInfo {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

function parsePermission(permission: Permission): PermissionDisplayInfo {
  const parts = permission.split(':');
  const resource = parts[0] || 'unknown';
  const action = parts[1] || 'unknown';
  const capitalizedResource = resource.charAt(0).toUpperCase() + resource.slice(1);
  const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);

  return {
    id: permission,
    name: `${capitalizedAction} ${capitalizedResource}`,
    description: `Can ${action} ${resource}`,
    resource,
    action,
  };
}

const groupFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

export function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isCreateMode = !id || id === 'new';

  // Track selected permissions locally
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [permissionsInitialized, setPermissionsInitialized] = React.useState(false);

  // Fetch group data (only in edit mode)
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.groups.detail(id!),
    queryFn: () => api.getGroup(id!),
    enabled: !isCreateMode && !!id,
  });

  // Fetch all permissions
  const { data: permissionsData } = useQuery({
    queryKey: queryKeys.permissions.list(),
    queryFn: () => api.listPermissions(),
  });

  const group = groupData?.success ? (groupData.data as Group) : undefined;
  const permissionsResponse = permissionsData?.success ? permissionsData.data : null;
  const permissionsList = (permissionsResponse as { permissions?: Array<{ id: string }> })?.permissions || [];
  const allPermissions: PermissionDisplayInfo[] = Array.isArray(permissionsList)
    ? permissionsList.map((p) => parsePermission((typeof p === 'string' ? p : p.id) as Permission))
    : [];

  // Form setup
  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Initialize form and permissions when group data loads (edit mode)
  React.useEffect(() => {
    if (group && !permissionsInitialized) {
      form.reset({
        name: group.name,
        description: group.description || '',
      });
      setSelectedPermissions(group.permissions?.map(String) || []);
      setPermissionsInitialized(true);
    }
  }, [group, form, permissionsInitialized]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: GroupFormData & { permissions: string[] }) =>
      api.createGroup({ name: data.name, description: data.description, permissions: data.permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      toastSuccess('Group created', 'The group has been successfully created.');
      navigate('/groups');
    },
    onError: (error: Error) => {
      toastError('Failed to create group', error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: GroupFormData & { permissions: string[] }) => {
      // Update group info and permissions in parallel
      await Promise.all([
        api.updateGroup(id!, { name: data.name, description: data.description }),
        api.updateGroupPermissions(id!, data.permissions),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id!) });
      toastSuccess('Group updated', 'The group has been successfully updated.');
    },
    onError: (error: Error) => {
      toastError('Failed to update group', error.message);
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (data: GroupFormData) => {
    const payload = { ...data, permissions: selectedPermissions };
    if (isCreateMode) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const handlePermissionToggle = (permissionId: string, enabled: boolean) => {
    setSelectedPermissions((prev) =>
      enabled ? [...prev, permissionId] : prev.filter((p) => p !== permissionId)
    );
  };

  // Group permissions by resource
  const groupedPermissions = React.useMemo(() => {
    const grouped: Record<string, PermissionDisplayInfo[]> = {};
    for (const permission of allPermissions) {
      const resource = permission.resource || 'other';
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(permission);
    }
    return grouped;
  }, [allPermissions]);

  if (!isCreateMode && groupLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!isCreateMode && !group) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">Group not found</p>
        <Button variant="link" asChild className="mt-4">
          <Link to="/groups">Back to groups</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isCreateMode ? 'Create Group' : group!.name}
            </h1>
            <p className="text-muted-foreground">
              {isCreateMode ? 'Set up a new permission group' : (group!.description || 'No description')}
            </p>
          </div>
        </div>
      </div>

      <div className={isCreateMode ? '' : 'grid gap-6 lg:grid-cols-3'}>
        <div className={isCreateMode ? '' : 'lg:col-span-2'}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Group Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Group Information</CardTitle>
                  <CardDescription>
                    {isCreateMode ? 'Enter group details' : 'View and edit group details'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Group name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Group description (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>Configure what members of this group can do</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                      <div key={resource} className="space-y-3">
                        <h4 className="text-sm font-semibold capitalize text-muted-foreground">
                          {resource}
                        </h4>
                        <div className="space-y-2">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{permission.name}</p>
                                {permission.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                              </div>
                              <Switch
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(permission.id, checked)
                                }
                                disabled={isSaving}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(groupedPermissions).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No permissions available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Save button */}
              <div className="flex justify-end">
                <Button type="submit" isLoading={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isCreateMode ? 'Create Group' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Sidebar — edit mode only */}
        {!isCreateMode && group && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Group ID</p>
                    <p className="text-muted-foreground font-mono text-xs">{group.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">{formatDateTime(group.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-muted-foreground">{formatDateTime(group.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupDetail;
