import { WithPermission } from '@/components/features/permission-gate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { groupApi, permissionApi } from '@/lib/api';
import { formatDateTime, getInitials } from '@/lib/utils';
import { queryKeys } from '@/types';
import type { Group, Permission } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Check, Save, Shield, Users, X } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

// Extended User type for group members display
interface GroupMember {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

// Extended Group type that includes users array
type GroupWithUsers = Group & {
  users?: GroupMember[];
};

// Helper interface for displaying permission info
interface PermissionDisplayInfo {
  id: string; // The full permission string
  name: string;
  description: string;
  resource: string;
  action: string;
}

// Helper to parse a permission string into display info
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

  // Fetch group data
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: queryKeys.groups.detail(id!),
    queryFn: () => groupApi.getGroup(id!),
    enabled: !!id,
  });

  // Fetch all permissions
  const { data: permissionsData } = useQuery({
    queryKey: queryKeys.permissions.list(),
    queryFn: () => permissionApi.listPermissions(),
  });

  const group = groupData?.success ? (groupData.data as GroupWithUsers) : undefined;
  const allPermissions: PermissionDisplayInfo[] = (
    permissionsData?.success ? permissionsData.data : []
  ).map((p: Permission) => parsePermission(p));

  // Form setup
  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  // Update form when group data loads
  React.useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        description: group.description || '',
      });
    }
  }, [group, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: GroupFormData) => groupApi.updateGroup(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id!) });
      toastSuccess('Group updated', 'The group has been successfully updated.');
    },
    onError: (error: Error) => {
      toastError('Failed to update group', error.message);
    },
  });

  // Permission mutations
  const addPermissionMutation = useMutation({
    mutationFn: (permissionId: string) => groupApi.addPermissionToGroup(id!, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id!) });
    },
    onError: (error: Error) => {
      toastError('Failed to add permission', error.message);
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => groupApi.removePermissionFromGroup(id!, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(id!) });
    },
    onError: (error: Error) => {
      toastError('Failed to remove permission', error.message);
    },
  });

  const onSubmit = (data: GroupFormData) => {
    updateMutation.mutate(data);
  };

  const hasPermission = (permissionId: string) => {
    return group?.permissions?.includes(permissionId) ?? false;
  };

  const handlePermissionToggle = (permission: PermissionDisplayInfo, enabled: boolean) => {
    if (enabled) {
      addPermissionMutation.mutate(permission.id);
    } else {
      removePermissionMutation.mutate(permission.id);
    }
  };

  // Group permissions by resource
  const groupedPermissions = React.useMemo(() => {
    const grouped: Record<string, PermissionDisplayInfo[]> = {};
    allPermissions.forEach((permission: PermissionDisplayInfo) => {
      const resource = permission.resource || 'other';
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(permission);
    });
    return grouped;
  }, [allPermissions]);

  if (groupLoading) {
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

  if (!group) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
              <p className="text-muted-foreground">{group.description || 'No description'}</p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {group.users?.length || 0} members
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Group Information</CardTitle>
              <CardDescription>View and edit group details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                  <WithPermission permission="groups:write">
                    <div className="flex justify-end">
                      <Button type="submit" isLoading={updateMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </WithPermission>
                </form>
              </Form>
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
                          <WithPermission
                            permission="groups:write"
                            fallback={
                              hasPermission(permission.id) ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground" />
                              )
                            }
                          >
                            <Switch
                              checked={hasPermission(permission.id)}
                              onCheckedChange={(checked) =>
                                handlePermissionToggle(permission, checked)
                              }
                              disabled={
                                addPermissionMutation.isPending ||
                                removePermissionMutation.isPending
                              }
                            />
                          </WithPermission>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </CardTitle>
              <CardDescription>Users in this group</CardDescription>
            </CardHeader>
            <CardContent>
              {group.users && group.users.length > 0 ? (
                <div className="space-y-3">
                  {group.users.slice(0, 10).map((user: GroupMember) => (
                    <Link
                      key={user.id}
                      to={`/users/${user.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>
                          {getInitials(user.displayName || user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.displayName || 'No name'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </Link>
                  ))}
                  {group.users.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{group.users.length - 10} more members
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No members in this group
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
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
      </div>
    </div>
  );
}

export default GroupDetail;
