import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthContext } from './contexts/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Home = lazy(() => import('./pages/Home'))
const Companies = lazy(() => import('./pages/Companies'))
const CompanyDetails = lazy(() => import('./pages/CompanyDetails'))
const Users = lazy(() => import('./pages/Users'))
const Settings = lazy(() => import('./pages/Settings'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Unauthorized = lazy(() => import('./pages/Unauthorized'))
const NotFound = lazy(() => import('./pages/NotFound'))

interface RequireAuthProps {
  children: JSX.Element
  allowedRoles?: string[]
}

const RequireAuth = ({ children, allowedRoles }: RequireAuthProps): JSX.Element => {
  const { user, token } = useContext(AuthContext)
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children
}

interface ErrorBoundaryProps {
  fallback?: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}

const protectedRoutes = [
  { path: '', element: <Home /> },
  { path: 'companies', element: <Companies /> },
  { path: 'companies/:companyId', element: <CompanyDetails /> },
  { path: 'companies/:companyId/users', element: <Users /> },
  { path: 'settings', element: <Settings /> },
  { path: 'admin', element: <AdminPanel />, allowedRoles: ['admin'] },
]

export function Routes(): JSX.Element {
  return (
    <BrowserRouter>
      <ErrorBoundary fallback={<div role="alert"><h1>Oops! Something went wrong.</h1></div>}>
        <Suspense fallback={<LoadingSpinner />}>
          <RouterRoutes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Dashboard />
                  <Outlet />
                </RequireAuth>
              }
            >
              {protectedRoutes.map(({ path, element, allowedRoles }) =>
                path === '' ? (
                  <Route key="index" index element={element} />
                ) : (
                  <Route
                    key={path}
                    path={path}
                    element={
                      allowedRoles
                        ? <RequireAuth allowedRoles={allowedRoles}>{element}</RequireAuth>
                        : element
                    }
                  />
                )
              )}
            </Route>
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}