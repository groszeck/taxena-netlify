const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const API_URL = env.VITE_API_URL || 'http://localhost:8888'

  return {
    plugins: [
      react(),
      netlify()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    define: {
      'process.env': JSON.stringify(env)
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, '/.netlify/functions')
        }
      }
    },
    build: {
      sourcemap: true,
      outDir: 'dist'
    }
  }
})