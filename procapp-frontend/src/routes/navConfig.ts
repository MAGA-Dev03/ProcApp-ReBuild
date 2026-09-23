import type { RoleName } from '@/types'
import {
  LayoutDashboard,
  FileStack,
  FileCheck2,
  Landmark,
  BarChart3,
  Warehouse,
  FolderKanban,
  Truck,
  Users,
  History,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Any of these roles grants access. */
  roles: RoleName[]
}

/** Single source of truth for sidebar visibility and route-level role gating. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SENIOR_MANAGER'] },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: FileStack,
    roles: ['PROCUREMENT', 'PROCUREMENT_MANAGER'],
  },
  {
    to: '/invoices/submitted',
    label: 'Submitted Invoices',
    icon: FileCheck2,
    roles: ['PROCUREMENT', 'PROCUREMENT_MANAGER'],
  },
  {
    to: '/invoices/add-to-finance',
    label: 'Add to Finance',
    icon: Landmark,
    roles: ['PROCUREMENT', 'PROCUREMENT_MANAGER'],
  },
  {
    to: '/invoices/report',
    label: 'Invoice Report',
    icon: BarChart3,
    roles: ['PROCUREMENT', 'PROCUREMENT_MANAGER', 'REPORT_USER', 'SENIOR_MANAGER'],
  },
  {
    to: '/site-keeper',
    label: 'Site Store Keeper',
    icon: Warehouse,
    roles: ['SITE_STORE_KEEPER'],
  },
  { to: '/projects', label: 'Projects', icon: FolderKanban, roles: ['ADMIN'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['ADMIN'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
  { to: '/audit-log', label: 'Audit Log', icon: History, roles: ['ADMIN'] },
]
