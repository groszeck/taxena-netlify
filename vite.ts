const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    root: process.cwd(),
    base: env.VITE_BASE_URL || '/',
    plugins: [react(), tsconfigPaths(), svgr()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT) || 3000,
      strictPort: true,
      open: true,
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/\.netlify\/functions/, ''),
        },
      },
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/\.netlify\/functions/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          includePaths: [path.resolve(__dirname, 'src')],
          additionalData: `@import "styles/variables.scss";`,
        },
      },
    },
  }
})