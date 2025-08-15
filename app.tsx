const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
})

function App(): JSX.Element {
  return (
    <React.StrictMode>
      <GlobalErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route element={<ProtectedRoute />}>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route
                        path="/dashboard"
                        element={
                          <Suspense fallback={<Spinner />}>
                            <DashboardPage />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/companies/:companyId"
                        element={
                          <Suspense fallback={<Spinner />}>
                            <CompanyPage />
                          </Suspense>
                        }
                      />
                      <Route element={<ProtectedRoute roles={['admin']} />}>
                        <Route
                          path="/users"
                          element={
                            <Suspense fallback={<Spinner />}>
                              <UsersPage />
                            </Suspense>
                          }
                        />
                      </Route>
                      <Route
                        path="/settings"
                        element={
                          <Suspense fallback={<Spinner />}>
                            <SettingsPage />
                          </Suspense>
                        }
                      />
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
              <ToastContainer />
            </ThemeProvider>
          </AuthProvider>
          {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </GlobalErrorBoundary>
    </React.StrictMode>
  )
}

export default App