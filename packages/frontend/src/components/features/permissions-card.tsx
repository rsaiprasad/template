import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface PermissionsCardProps {
  permissions: string[];
  isSuperAdmin?: boolean;
}

export function PermissionsCard({ permissions, isSuperAdmin }: PermissionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permissions
        </CardTitle>
        <CardDescription>Permissions assigned through groups</CardDescription>
      </CardHeader>
      <CardContent>
        {isSuperAdmin ? (
          <Badge variant="default">Super Admin</Badge>
        ) : permissions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {permissions.map((permission) => (
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
  );
}
