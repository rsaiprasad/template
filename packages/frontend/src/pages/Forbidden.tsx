import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Home, Mail, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Forbidden() {
  const { user } = useAuth();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="space-y-6 max-w-md">
        {/* 403 Visual */}
        <div className="relative">
          <h1 className="text-9xl font-bold text-muted-foreground/20">403</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldOff className="h-16 w-16 text-destructive/60" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">
            Sorry, you don't have permission to access this page. This might be because your account
            doesn't have the required permissions.
          </p>
        </div>

        {/* Current user info */}
        {user && (
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Need access? Contact your administrator to request the necessary permissions.
          </p>
          <Button variant="link" size="sm" className="text-muted-foreground">
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Forbidden;
