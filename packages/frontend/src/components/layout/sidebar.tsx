import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    permission: 'users:read',
  },
  {
    title: 'Groups',
    href: '/groups',
    icon: Shield,
    permission: 'groups:read',
  },
  {
    title: 'Audit Logs',
    href: '/audit-logs',
    icon: FileText,
    permission: 'audit:read',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, isAdmin } = usePermissions();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return isAdmin || hasPermission(item.permission);
  });

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-background transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b px-4',
          isCollapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            A
          </div>
          {!isCollapsed && <span className="font-semibold text-lg">Admin</span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse button */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn('w-full', isCollapsed ? 'px-2' : 'justify-start')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
