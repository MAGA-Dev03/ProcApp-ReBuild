import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChevronsLeft, LogOut, Menu, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { assetUrl, cn } from '@/lib/utils'
import { useAuth, useHasRole } from '@/features/auth'
import { NAV_ITEMS } from '@/routes/navConfig'

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 p-2" onClick={onNavigate}>
      {NAV_ITEMS.map((item) => (
        <VisibleNavLink key={item.to} item={item} collapsed={collapsed} />
      ))}
    </nav>
  )
}

function VisibleNavLink({
  item,
  collapsed,
}: {
  item: (typeof NAV_ITEMS)[number]
  collapsed: boolean
}) {
  const allowed = useHasRole(...item.roles)
  if (!allowed) return null

  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh w-full">
      <aside
        className={cn(
          'hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] md:flex md:flex-col',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex h-14 items-center border-b border-sidebar-border',
            collapsed ? 'justify-center px-2' : 'justify-between px-4',
          )}
        >
          {collapsed ? (
            // Collapsed: the full lockup (with tagline) is illegible at icon-rail width, so show
            // just the mark, and let it double as the expand button instead of squeezing a
            // separate toggle into the same 64px-wide row.
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="rounded-md bg-white p-1 shadow-sm"
            >
              <img src={assetUrl('/logo-mark.png')} alt="" className="size-6" />
            </button>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-md bg-white p-1 shadow-sm">
                  <img src={assetUrl('/logo.png')} alt="MAGA Engineering" className="h-7 w-auto" />
                </span>
                <span className="truncate font-semibold">ProcApp</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft className="size-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks collapsed={collapsed} />
        </div>
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-64 bg-sidebar p-0 text-sidebar-foreground sm:max-w-64"
        >
          <SheetHeader className="flex-row items-center gap-2 border-b border-sidebar-border">
            <span className="shrink-0 rounded-md bg-white p-1 shadow-sm">
              <img src={assetUrl('/logo.png')} alt="MAGA Engineering" className="h-7 w-auto" />
            </span>
            <SheetTitle>ProcApp</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <NavLinks collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <span className="truncate text-sm text-muted-foreground">
              Invoice Management System
            </span>
          </div>

          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {initials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{currentUser.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-medium">{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground">{currentUser.email}</span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {currentUser.roles.map((role) => (
                        <Badge key={role.id} variant="secondary" className="text-[10px]">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <UserIcon className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>

        <footer className="shrink-0 border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          Copyright © MAGA IT 2026. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
