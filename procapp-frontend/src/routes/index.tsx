import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage, ProfilePage, ProtectedRoute, RequireRole } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import {
  AddToFinancePage,
  InvoiceReportPage,
  InvoicesPage,
  InvoicesSubmittedPage,
} from '@/features/invoices'
import { SiteKeeperPage } from '@/features/site-keeper'
import { ProjectsPage } from '@/features/projects'
import { SuppliersPage } from '@/features/suppliers'
import { UsersPage } from '@/features/users'
import { AuditLogPage } from '@/features/audit-log'
import { StyleGuidePage } from '@/features/style-guide/StyleGuidePage'
import { NAV_ITEMS } from './navConfig'

const rolesFor = (path: string) => NAV_ITEMS.find((item) => item.to === path)?.roles ?? []

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/profile" replace /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'dashboard',
        element: (
          <RequireRole roles={rolesFor('/dashboard')}>
            <DashboardPage />
          </RequireRole>
        ),
      },
      {
        path: 'invoices',
        element: (
          <RequireRole roles={rolesFor('/invoices')}>
            <InvoicesPage />
          </RequireRole>
        ),
      },
      {
        path: 'invoices/submitted',
        element: (
          <RequireRole roles={rolesFor('/invoices/submitted')}>
            <InvoicesSubmittedPage />
          </RequireRole>
        ),
      },
      {
        path: 'invoices/add-to-finance',
        element: (
          <RequireRole roles={rolesFor('/invoices/add-to-finance')}>
            <AddToFinancePage />
          </RequireRole>
        ),
      },
      {
        path: 'invoices/report',
        element: (
          <RequireRole roles={rolesFor('/invoices/report')}>
            <InvoiceReportPage />
          </RequireRole>
        ),
      },
      {
        path: 'site-keeper',
        element: (
          <RequireRole roles={rolesFor('/site-keeper')}>
            <SiteKeeperPage />
          </RequireRole>
        ),
      },
      {
        path: 'projects',
        element: (
          <RequireRole roles={rolesFor('/projects')}>
            <ProjectsPage />
          </RequireRole>
        ),
      },
      {
        path: 'suppliers',
        element: (
          <RequireRole roles={rolesFor('/suppliers')}>
            <SuppliersPage />
          </RequireRole>
        ),
      },
      {
        path: 'users',
        element: (
          <RequireRole roles={rolesFor('/users')}>
            <UsersPage />
          </RequireRole>
        ),
      },
      {
        path: 'audit-log',
        element: (
          <RequireRole roles={rolesFor('/audit-log')}>
            <AuditLogPage />
          </RequireRole>
        ),
      },
      // Not in NAV_ITEMS, so it never appears in the sidebar - reachable directly at /style-guide.
      { path: 'style-guide', element: <StyleGuidePage /> },
    ],
  },
], { basename: import.meta.env.BASE_URL })
