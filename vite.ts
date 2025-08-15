const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    envDir: './',
    envPrefix: 'VITE_',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@api': path.resolve(__dirname, './src/api')
      }
    },
    plugins: [
      react(),
      tsconfigPaths()
    ],
    server: {
      port: env.VITE_PORT ? parseInt(env.VITE_PORT, 10) : 3000,
      strictPort: true,
      open: true,
      host: '0.0.0.0'
    },
    preview: {
      port: env.VITE_PREVIEW_PORT ? parseInt(env.VITE_PREVIEW_PORT, 10) : 4173,
      strictPort: true,
      host: '0.0.0.0'
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html')
      }
    }
  }
})