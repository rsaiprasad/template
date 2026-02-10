import { ErrorStatePage } from '@/components/features/error-state-page';
import { Search } from 'lucide-react';

export function NotFound() {
  return (
    <ErrorStatePage
      code="404"
      icon={Search}
      title="Page not found"
      description="Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed."
      footer={
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please contact your administrator.
        </p>
      }
    />
  );
}

export default NotFound;
