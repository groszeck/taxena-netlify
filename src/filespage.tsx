const FilesPage = (): JSX.Element => {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const mountedRef = useRef<boolean>(true)

  useEffect(() => {
    mountedRef.current = true
    if (!token) {
      navigate('/login')
      return
    }
    fetchFiles()
    return () => {
      mountedRef.current = false
    }
  }, [token, navigate])

  const handleUnauthorized = (): void => {
    logout?.()
    navigate('/login')
  }

  const fetchFiles = async (): Promise<void> => {
    setLoading(true)
    setError('')
    const controller = new AbortController()
    try {
      const res = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Error ${res.status}`)
      }
      const data: FileItem[] = await res.json()
      if (mountedRef.current) {
        setFiles(data)
      }
    } catch (err: any) {
      if (!mountedRef.current) return
      if (err.name === 'AbortError') return
      setError(err.message || 'Failed to load files.')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!e.target.files?.length) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`)
      }
      await fetchFiles()
    } catch (err: any) {
      setError(err.message || 'File upload failed.')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        e.target.value = ''
      }
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this file?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`)
      }
      if (mountedRef.current) {
        setFiles(prev => prev.filter(f => f.id !== id))
      }
    } catch (err: any) {
      setError(err.message || 'File deletion failed.')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  const handleDownload = async (id: string, filename: string): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/files/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        handleUnauthorized()
        return
      }
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'File download failed.')
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  return (
    <div className="files-page container">
      <h1>Files</h1>
      <div className="actions">
        <label className="upload-button">
          Upload File
          <input type="file" onChange={handleUpload} hidden />
        </label>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && files.length === 0 && <p>No files found.</p>}
      {files.length > 0 && (
        <table className="files-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Uploaded At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id}>
                <td>{file.filename}</td>
                <td>{new Date(file.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    onClick={() => handleDownload(file.id, file.filename)}
                    className="button download"
                    disabled={loading}
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="button delete"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default FilesPage