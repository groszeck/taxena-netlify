const ProjectsPage: React.FC = (): JSX.Element => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setProjects([])
      return
    }

    const controller = new AbortController()
    const signal = controller.signal

    const fetchProjects = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/projects', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal,
        })

        if (response.status === 401) {
          navigate('/login')
          return
        }

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(errText || `Failed to fetch projects: ${response.status}`)
        }

        const result = await response.json()
        setProjects(Array.isArray(result.projects) ? result.projects : [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'An unexpected error occurred')
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchProjects()

    return () => {
      controller.abort()
    }
  }, [token, navigate])

  if (loading) {
    return <div className="projects-loading">Loading projects...</div>
  }

  if (error) {
    return <div className="projects-error">Error: {error}</div>
  }

  return (
    <div className="projects-page">
      <header className="projects-header">
        <h1>Projects</h1>
        <Link to="/projects/new">
          <button type="button">+ New Project</button>
        </Link>
      </header>

      {projects.length === 0 ? (
        <p className="no-projects">No projects found. Create one to get started.</p>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr
                key={project.id}
                role="button"
                tabIndex={0}
                className="project-row"
                onClick={() => navigate(`/projects/${project.id}`)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/projects/${project.id}`)
                  }
                }}
              >
                <td className="project-cell">{project.name}</td>
                <td className="project-cell">{project.clientName || '?'}</td>
                <td className="project-cell text-capitalize">{project.status}</td>
                <td className="project-cell">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : '?'}
                </td>
                <td className="project-cell">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : '?'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default ProjectsPage