import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Shield,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { WithPermission } from '@/components/features/permission-gate';
import { userApi, groupApi, auditLogApi } from '@/lib/api';
import { queryKeys } from '@/types';
import { getFirstName, formatRelativeTime } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  href?: string;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
  href,
}: StatCardProps) {
  const content = (
    <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

export function Dashboard() {
  const { user } = useAuth();
  const { canManageUsers, canManageGroups, canViewAuditLogs } = usePermissions();

  // Fetch stats
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.users.list({ pageSize: 1 }),
    queryFn: () => userApi.listUsers({ pageSize: 1 }),
    enabled: canManageUsers,
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: queryKeys.groups.list({ pageSize: 1 }),
    queryFn: () => groupApi.listGroups({ pageSize: 1 }),
    enabled: canManageGroups,
  });

  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: queryKeys.auditLogs.list({ pageSize: 5 }),
    queryFn: () => auditLogApi.listAuditLogs({ pageSize: 5 }),
    enabled: canViewAuditLogs,
  });

  const firstName = getFirstName(user?.displayName);

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Hello, {firstName || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Welcome to your admin dashboard. Here's what's happening.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <WithPermission permission="users:read">
          <StatCard
            title="Total Users"
            value={usersData?.total ?? 0}
            description="Active users in the system"
            icon={Users}
            isLoading={usersLoading}
            href="/users"
          />
        </WithPermission>

        <WithPermission permission="groups:read">
          <StatCard
            title="Groups"
            value={groupsData?.total ?? 0}
            description="Permission groups"
            icon={Shield}
            isLoading={groupsLoading}
            href="/groups"
          />
        </WithPermission>

        <WithPermission permission="audit:read">
          <StatCard
            title="Recent Activity"
            value={auditLogsData?.total ?? 0}
            description="Audit log entries"
            icon={FileText}
            isLoading={auditLogsLoading}
            href="/audit-logs"
          />
        </WithPermission>

        <StatCard
          title="System Status"
          value="Healthy"
          description="All systems operational"
          icon={Activity}
        />
      </div>

      {/* Quick actions and recent activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Quick actions */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <WithPermission permission="users:read">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/users">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </WithPermission>

            <WithPermission permission="groups:read">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/groups">
                  <Shield className="mr-2 h-4 w-4" />
                  Manage Groups
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </WithPermission>

            <WithPermission permission="audit:read">
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/audit-logs">
                  <FileText className="mr-2 h-4 w-4" />
                  View Audit Logs
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </WithPermission>

            <Button variant="outline" className="justify-start" asChild>
              <Link to="/settings">
                <TrendingUp className="mr-2 h-4 w-4" />
                Settings
                <ArrowRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <WithPermission
              permission="audit:read"
              fallback={
                <p className="text-sm text-muted-foreground">
                  You don't have permission to view audit logs.
                </p>
              }
            >
              {auditLogsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-2 w-2 rounded-full mt-2" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : auditLogsData?.data && auditLogsData.data.length > 0 ? (
                <div className="space-y-4">
                  {auditLogsData.data.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-4">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{log.action}</span> on{' '}
                          <span className="text-muted-foreground">
                            {log.resourceType}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity to display.
                </p>
              )}
            </WithPermission>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
