const env = loadEnv(mode, process.cwd(), 'VITE_')
  const devPort = Number(env.VITE_DEV_PORT) || 3000
  const netlifyFuncsPort = Number(env.VITE_NETLIFY_DEV_PORT) || 8888

  return {
    base: '/',
    define: {
      'process.env': env,
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: devPort,
      open: true,
      proxy: {
        '/.netlify/functions': {
          target: `http://localhost:${netlifyFuncsPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  }
})