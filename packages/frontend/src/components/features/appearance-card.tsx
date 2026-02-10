import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface AppearanceCardProps {
  theme: string;
  onThemeChange: (theme: Theme) => void;
}

export function AppearanceCard({ theme, onThemeChange }: AppearanceCardProps) {
  return (
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
              {(['light', 'dark', 'system'] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={theme === t ? 'default' : 'outline'}
                  className="capitalize"
                  onClick={() => onThemeChange(t)}
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
  );
}
