const root = process.cwd()
  const env = loadEnv(mode, root)
  const isDev = command === 'serve'
  const port = Number(env.VITE_PORT) || 3000
  const proxyTarget = env.NETLIFY_DEV_URL || 'http://localhost:8888'

  const defineEnv = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, val]) => [`import.meta.env.${key}`, JSON.stringify(val)])
  )

  return {
    root,
    base: env.VITE_BASE || '/',
    define: defineEnv,
    resolve: {
      alias: {
        '@': path.resolve(root, 'src'),
      },
    },
    plugins: [react()],
    server: {
      port,
      strictPort: true,
      ...(isDev && {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            rewrite: p => p.replace(/^\/api/, '/.netlify/functions'),
          },
        },
      }),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: env.VITE_SOURCEMAP === 'true',
      rollupOptions: {
        input: path.resolve(root, 'index.html'),
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  }
})