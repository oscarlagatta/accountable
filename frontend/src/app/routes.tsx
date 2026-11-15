import { Route, Routes } from 'react-router'
import { NotFoundMessage } from '@/components/RecordLayout'
import { ContactPage } from '@/features/contacts/ContactPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DealPage } from '@/features/deals/DealPage'
import { DealsPage } from '@/features/deals/DealsPage'
import { OrganizationPage } from '@/features/organizations/OrganizationPage'
import { OrganizationsPage } from '@/features/organizations/OrganizationsPage'
import { PipelinePage } from '@/features/pipeline/PipelinePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/organizations" element={<OrganizationsPage />} />
      <Route path="/organizations/:id" element={<OrganizationPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/contacts/:id" element={<ContactPage />} />
      <Route path="/deals" element={<DealsPage />} />
      <Route path="/deals/:id" element={<DealPage />} />
      <Route path="/pipeline" element={<PipelinePage />} />
      <Route path="*" element={<NotFoundMessage what="Page" back={{ to: '/', label: 'Back to the dashboard' }} />} />
    </Routes>
  )
}
