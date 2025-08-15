const rawEnv = loadEnv(mode, process.cwd(), 'VITE_')

  // Validate and coerce environment variables
  const envSchema = z.object({
    VITE_BASE_URL: z.string().optional(),
    VITE_DEV_SERVER_PORT: z
      .string()
      .regex(/^\d+$/, { message: 'VITE_DEV_SERVER_PORT must be a number' })
      .optional(),
  })
  const parsedEnv = envSchema.parse(rawEnv)

  const base = parsedEnv.VITE_BASE_URL ?? '/'
  const port = parsedEnv.VITE_DEV_SERVER_PORT != null
    ? Number(parsedEnv.VITE_DEV_SERVER_PORT)
    : 3000

  return {
    root: path.resolve(__dirname, 'src'),
    base,
    server: {
      port,
      open: true,
      strictPort: true,
      fs: {
        strict: true
      }
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      sourcemap: mode === 'development'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    plugins: [
      react(),
      tsconfigPaths()
    ]
  }
})