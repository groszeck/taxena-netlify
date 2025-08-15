export function initLayout(): void {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element #root not found')
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 300_000,
        cacheTime: 300_000,
        retry: 1,
        refetchOnWindowFocus: false
      }
    }
  })

  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <IdentityContextProvider>
              <AuthContextProvider>
                <CompanyContextProvider>
                  <App />
                </CompanyContextProvider>
              </AuthContextProvider>
            </IdentityContextProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}

export default initLayout