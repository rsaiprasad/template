import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="space-y-6 max-w-md">
        {/* 404 Visual */}
        <div className="relative">
          <h1 className="text-9xl font-bold text-muted-foreground/20">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="h-16 w-16 text-muted-foreground" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved, deleted, or never existed.
          </p>
        </div>

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
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}

export default NotFound;
