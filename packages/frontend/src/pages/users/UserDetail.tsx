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
import { toastError, toastSuccess } from '@/hooks/useToast';
import { api } from '@/api';
import { formatDateTime, getInitials } from '@/lib/utils';
import { queryKeys } from '@/types';
import type { Group, User } from '@/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Mail, Save, Shield, User as UserIcon, X } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

// Extended User type that includes groups array
interface UserGroup {
  id: string;
  name: string;
}

type UserWithGroups = User & {
  groups?: UserGroup[];
  firebaseUid?: string;
};

// Separator component since it wasn't created
const SeparatorComponent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className="shrink-0 bg-border h-[1px] w-full my-4" {...props} />
  )
);
SeparatorComponent.displayName = 'Separator';

const userFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  status: z.enum(['active', 'disabled']),
  groupIds: z.array(z.string()),
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

  const user = userData?.success ? (userData.data as UserWithGroups) : undefined;
  const availableGroups: Group[] = groupsData?.data || [];

  // Form setup
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      status: 'active',
      groupIds: [],
    },
  });

  // Update form when user data loads
  React.useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        email: user.email,
        status: user.status,
        groupIds: user.groups?.map((g: UserGroup) => g.id) || [],
      });
    }
  }, [user, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UserFormData) => api.updateUser(id!, data),
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

  // Add/remove group mutations
  const addGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.addUserToGroup(id!, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id!) });
    },
  });

  const removeGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.removeUserFromGroup(id!, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id!) });
    },
  });

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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                {isNew ? 'Enter the details for the new user' : 'View and edit user details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                  <WithPermission permission="users:write">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Groups card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Groups
              </CardTitle>
              <CardDescription>Manage user group memberships</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user?.groups && user.groups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.groups.map((group: UserGroup) => (
                    <Badge key={group.id} variant="secondary" className="flex items-center gap-1">
                      {group.name}
                      <WithPermission permission="users:write">
                        <button
                          onClick={() => removeGroupMutation.mutate(group.id)}
                          className="ml-1 rounded-full hover:bg-destructive/20"
                          disabled={removeGroupMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </WithPermission>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not a member of any groups</p>
              )}

              <WithPermission permission="users:write">
                <SeparatorComponent />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Add to group</p>
                  <Select
                    onValueChange={(value) => addGroupMutation.mutate(value)}
                    disabled={addGroupMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups
                        .filter(
                          (g: Group) => !user?.groups?.some((ug: UserGroup) => ug.id === g.id)
                        )
                        .map((group: Group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </WithPermission>
            </CardContent>
          </Card>

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
                    <p className="font-medium">Firebase UID</p>
                    <p className="text-muted-foreground font-mono text-xs">{user.firebaseUid}</p>
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
