import { api } from '@/api';
import { AppearanceCard } from '@/components/features/appearance-card';
import { MetadataCard } from '@/components/features/metadata-card';
import { NotificationsCard } from '@/components/features/notifications-card';
import { PageHeader } from '@/components/features/page-header';
import { PermissionsCard } from '@/components/features/permissions-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useAuth } from '@/hooks/useAuth';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { getInitials } from '@/lib/utils';
import { selectTheme, useThemeStore } from '@/stores/theme-store';
import { queryKeys } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useThemeStore(selectTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      email: user?.email || '',
      emailNotifications: true,
      pushNotifications: false,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => {
      if (!user?.uid) throw new Error('User not found');
      return api.updateUser(user.uid, { displayName: data.displayName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      toastSuccess('Profile updated', 'Your profile has been successfully updated.');
    },
    onError: (error: Error) => {
      toastError('Failed to update profile', error.message);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Update profile"
        description="Update your profile information and preferences."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={user?.photoURL || undefined} />
                      <AvatarFallback className="text-lg">
                        {user?.displayName ? getInitials(user.displayName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Profile photo is synced from your Google account
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
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
                          <Input {...field} disabled />
                        </FormControl>
                        <FormDescription>
                          Email is linked to your Google account and cannot be changed
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
              <AppearanceCard theme={theme} onThemeChange={setTheme} />

              {/* Save button */}
              <div className="flex justify-end">
                <Button type="submit" isLoading={updateProfileMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Permissions */}
          <PermissionsCard permissions={user?.permissions || []} />

          {/* Account Info */}
          <MetadataCard
            title="Account Information"
            items={[
              { label: 'User ID', value: user?.uid || '', mono: true },
              { label: 'Authentication Provider', value: 'Google' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

export default Settings;
