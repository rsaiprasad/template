import { ErrorStatePage } from '@/components/features/error-state-page';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Mail, ShieldOff } from 'lucide-react';

export function Forbidden() {
  const { user } = useAuth();

  return (
    <ErrorStatePage
      code="403"
      icon={ShieldOff}
      iconClassName="text-destructive/60"
      title="Access Denied"
      description="Sorry, you don't have permission to access this page. This might be because your account doesn't have the required permissions."
      footer={
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Need access? Contact your administrator to request the necessary permissions.
          </p>
          <Button variant="link" size="sm" className="text-muted-foreground">
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </div>
      }
    >
      {user && (
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </div>
      )}
    </ErrorStatePage>
  );
}

export default Forbidden;
