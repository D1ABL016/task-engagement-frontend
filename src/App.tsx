import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import EngagementsPage from './pages/EngagementsPage'
import EngagementDetailPage from './pages/EngagementDetailPage'
import NewEngagementPage from './pages/NewEngagementPage'
import ClientsPage from './pages/admin/ClientsPage'
import UsersPage from './pages/admin/UsersPage'
import ServiceTypesPage from './pages/admin/ServiceTypesPage'
import { ReferenceProvider } from './reference/ReferenceContext'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<ReferenceProvider><AppLayout /></ReferenceProvider>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/engagements" element={<EngagementsPage />} />
            <Route path="/engagements/:engagementId" element={<EngagementDetailPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['manager', 'admin']} />}>
          <Route element={<ReferenceProvider><AppLayout /></ReferenceProvider>}>
            <Route path="/engagements/new" element={<NewEngagementPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth roles={['admin']} />}>
          <Route element={<ReferenceProvider><AppLayout /></ReferenceProvider>}>
            <Route path="/admin/clients" element={<ClientsPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/service-types" element={<ServiceTypesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<div className="p-8">Page not found.</div>} />
      </Routes>
    </AuthProvider>
  )
}
