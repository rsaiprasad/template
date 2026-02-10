import { api } from '@/api';
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
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { getInitials } from '@/lib/utils';
import { selectTheme, useThemeStore } from '@/stores/theme-store';
import { queryKeys } from '@/types';
import type { Theme } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Palette, Save, Shield, User } from 'lucide-react';
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

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Update profile</h1>
        <p className="text-muted-foreground">Update your profile information and preferences.</p>
      </div>

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
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Configure how you receive notifications</CardDescription>
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
                            Receive push notifications in your browser
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

              {/* Appearance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize how the dashboard looks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Theme</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                          <Button
                            key={t}
                            type="button"
                            variant={theme === t ? 'default' : 'outline'}
                            className="capitalize"
                            onClick={() => handleThemeChange(t)}
                          >
                            {t}
                          </Button>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select your preferred theme or use system settings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissions
              </CardTitle>
              <CardDescription>Permissions assigned through groups</CardDescription>
            </CardHeader>
            <CardContent>
              {user?.permissions && user.permissions.length > 0 ? (
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

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">User ID</p>
                <p className="text-muted-foreground font-mono text-xs break-all">{user?.uid}</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">Authentication Provider</p>
                <p className="text-muted-foreground">Google</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Settings;
