import { api } from '@/api';
import type { Group, UserWithPermissions } from '@/api';
import { WithPermission } from '@/components/features/permission-gate';
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
import { Switch } from '@/components/ui/switch';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { formatDateTime, getInitials } from '@/lib/utils';
import { queryKeys } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Mail,
  Palette,
  Save,
  Shield,
  User as UserIcon,
  X,
} from 'lucide-react';
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
  const isNew = id === 'new';

  // Fetch user data
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.users.detail(id!),
    queryFn: () => api.getUser(id!),
    enabled: !isNew && !!id,
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

  if (userLoading && !isNew) {
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

  if (!(user || isNew)) {
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
            {user && (
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isNew ? 'New User' : user?.displayName || 'User Details'}
              </h1>
              <p className="text-muted-foreground">
                {isNew ? 'Create a new user account' : user?.email}
              </p>
            </div>
          </div>
        </div>
        {user && (
          <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
            {user.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                  <CardDescription>
                    {isNew ? 'Enter the details for the new user' : 'View and edit user details'}
                  </CardDescription>
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
                            disabled={!isNew}
                          />
                        </FormControl>
                        {!isNew && (
                          <FormDescription>Email cannot be changed after creation</FormDescription>
                        )}
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
              {!isNew && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Configure how this user receives notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>Receive notifications via email</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pushNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Push Notifications</FormLabel>
                            <FormDescription>
                              Receive push notifications in the browser
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Appearance Settings */}
              {!isNew && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Appearance
                    </CardTitle>
                    <CardDescription>Customize how the dashboard looks for this user</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Theme</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['light', 'dark', 'system'] as const).map((t) => (
                            <Button
                              key={t}
                              type="button"
                              variant={form.watch('theme') === t ? 'default' : 'outline'}
                              className="capitalize"
                              onClick={() => form.setValue('theme', t, { shouldDirty: true })}
                            >
                              {t}
                            </Button>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Select the preferred theme or use system settings
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

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
          {user && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissions
                </CardTitle>
                <CardDescription>Permissions assigned through groups</CardDescription>
              </CardHeader>
              <CardContent>
                {user.isSuperAdmin ? (
                  <Badge variant="default">Super Admin</Badge>
                ) : user.permissions && user.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No specific permissions assigned</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata card */}
          {user && (
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">User ID</p>
                    <p className="text-muted-foreground font-mono text-xs">{user.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-muted-foreground font-mono text-xs">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">{formatDateTime(user.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-muted-foreground">{formatDateTime(user.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDetail;
