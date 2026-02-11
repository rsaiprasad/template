import { api } from '@/api';
import type { Group, UserWithPermissions } from '@/api';
import { AppearanceCard } from '@/components/features/appearance-card';
import { MetadataCard } from '@/components/features/metadata-card';
import { NotificationsCard } from '@/components/features/notifications-card';
import { WithPermission } from '@/components/features/permission-gate';
import { PermissionsCard } from '@/components/features/permissions-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { formatDateTime, getInitials } from '@/lib/utils';
import { queryKeys } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Mail, Save, User as UserIcon, X } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

const userFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  status: z.enum(['active', 'disabled']),
  groupIds: z.array(z.string()),
  theme: z.enum(['light', 'dark', 'system']),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.users.detail(id!),
    queryFn: () => api.getUser(id!),
    enabled: !!id,
  });

  // Fetch available groups
  const { data: groupsData } = useQuery({
    queryKey: queryKeys.groups.list({}),
    queryFn: () => api.listGroups({ pageSize: 100 }),
  });

  const user = userData?.success ? (userData.data as UserWithPermissions) : undefined;
  const availableGroups: Group[] = groupsData?.data || [];

  // Form setup
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      status: 'active',
      groupIds: [],
      theme: 'system',
      emailNotifications: true,
      pushNotifications: false,
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        email: user.email,
        status: user.status,
        groupIds: user.groupIds || [],
        theme: user.preferences?.theme || 'system',
        emailNotifications: true,
        pushNotifications: false,
      });
    }
  }, [user, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      api.updateUser(id!, {
        displayName: data.displayName,
        status: data.status,
        groupIds: data.groupIds,
        preferences: { theme: data.theme },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id!) });
      toastSuccess('User updated', 'The user has been successfully updated.');
    },
    onError: (error: Error) => {
      toastError('Failed to update user', error.message);
    },
  });

  const onSubmit = (data: UserFormData) => {
    updateMutation.mutate(data);
  };

  // Watch groupIds from form state
  const formGroupIds = form.watch('groupIds');

  // Build group name map for display
  const groupNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const g of availableGroups) {
      map.set(g.id, g.name);
    }
    // Also use groupNames from the API response for groups not in availableGroups
    if (user?.groupIds && user?.groupNames) {
      for (let i = 0; i < user.groupIds.length; i++) {
        if (!map.has(user.groupIds[i]!)) {
          map.set(user.groupIds[i]!, user.groupNames[i] || 'Unknown');
        }
      }
    }
    return map;
  }, [availableGroups, user]);

  const removeGroup = (groupId: string) => {
    const current = form.getValues('groupIds');
    if (current.length <= 1) {
      toastError('Cannot remove group', 'Users must belong to at least one group.');
      return;
    }
    form.setValue(
      'groupIds',
      current.filter((id) => id !== groupId),
      { shouldDirty: true }
    );
  };

  const addGroup = (groupId: string) => {
    const current = form.getValues('groupIds');
    if (!current.includes(groupId)) {
      form.setValue('groupIds', [...current, groupId], { shouldDirty: true });
    }
  };

  // Groups not yet assigned
  const unassignedGroups = availableGroups.filter((g) => !formGroupIds.includes(g.id));

  if (userLoading) {
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-muted-foreground">User not found</p>
        <Button variant="link" asChild className="mt-4">
          <Link to="/users">Back to users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {user.displayName || 'User Details'}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
        <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
          {user.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                  <CardDescription>View and edit user details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            {...field}
                            disabled
                          />
                        </FormControl>
                        <FormDescription>Email cannot be changed after creation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Groups */}
                  <FormField
                    control={form.control}
                    name="groupIds"
                    render={() => (
                      <FormItem>
                        <FormLabel>Groups</FormLabel>
                        <div className="space-y-3">
                          {formGroupIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {formGroupIds.map((gid) => (
                                <Badge
                                  key={gid}
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  {groupNameMap.get(gid) || gid}
                                  <button
                                    type="button"
                                    onClick={() => removeGroup(gid)}
                                    className="ml-1 rounded-full hover:bg-destructive/20"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No groups assigned</p>
                          )}

                          {unassignedGroups.length > 0 && (
                            <Select onValueChange={addGroup}>
                              <SelectTrigger>
                                <SelectValue placeholder="Add to group..." />
                              </SelectTrigger>
                              <SelectContent>
                                {unassignedGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <FormDescription>
                          Permissions are merged from all assigned groups
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <NotificationsCard control={form.control} />

              {/* Appearance Settings */}
              <AppearanceCard
                theme={form.watch('theme')}
                onThemeChange={(t) => form.setValue('theme', t, { shouldDirty: true })}
              />

              {/* Save button */}
              <WithPermission permission="users:update">
                <div className="flex justify-end">
                  <Button type="submit" isLoading={updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </WithPermission>
            </form>
          </Form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Permissions card */}
          <PermissionsCard permissions={user.permissions} isSuperAdmin={user.isSuperAdmin} />

          {/* Metadata card */}
          <MetadataCard
            title="Details"
            items={[
              { icon: UserIcon, label: 'User ID', value: user.id, mono: true },
              { icon: Mail, label: 'Email', value: user.email, mono: true },
              { icon: Calendar, label: 'Created', value: formatDateTime(user.createdAt) },
              { icon: Calendar, label: 'Last Updated', value: formatDateTime(user.updatedAt) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
