import { createBrowserRouter, Outlet } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { HistoryPage } from '@/pages/HistoryPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RunPage } from '@/pages/RunPage'

function Layout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'runs', element: <HistoryPage /> },
      { path: 'runs/:id', element: <RunPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
