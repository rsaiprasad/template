import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import type * as React from 'react';
import { Link } from 'react-router-dom';

interface ErrorStatePageProps {
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function ErrorStatePage({
  code,
  icon: Icon,
  iconClassName = 'text-muted-foreground',
  title,
  description,
  children,
  footer,
}: ErrorStatePageProps) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="space-y-6 max-w-md">
        {/* Error code visual */}
        <div className="relative">
          <h1 className="text-9xl font-bold text-muted-foreground/20">{code}</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className={`h-16 w-16 ${iconClassName}`} />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {/* Extra content (e.g., user email) */}
        {children}

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

        {/* Footer */}
        {footer}
      </div>
    </div>
  );
}
