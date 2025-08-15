const env = loadEnv(mode, process.cwd(), '')

  // Expose only VITE_ prefixed vars to client
  const defineEnv = Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => key.startsWith('VITE_'))
      .map(([key, val]) => [`process.env.${key}`, JSON.stringify(val)])
  )

  const netlifyPortRaw = env.NETLIFY_DEV_PORT
  if (!netlifyPortRaw) {
    throw new Error('Environment variable NETLIFY_DEV_PORT is required for the Netlify functions proxy.')
  }
  const netlifyPort = Number(netlifyPortRaw)

  return {
    base: env.VITE_PUBLIC_BASE_URL || '/',
    plugins: [
      react()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      port: Number(env.VITE_DEV_PORT) || 3000,
      open: true,
      proxy: {
        '/api': {
          target: `http://localhost:${netlifyPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, '/.netlify/functions')
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: mode !== 'production'
    },
    define: defineEnv
  }
})