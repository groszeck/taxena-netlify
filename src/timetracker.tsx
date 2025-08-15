const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
}

const TimeTracker: React.FC = () => {
  const [token, setToken] = useState<string>('')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null)
  const [currentSeconds, setCurrentSeconds] = useState<number>(0)
  const [isFetching, setIsFetching] = useState<boolean>(false)
  const [isStarting, setIsStarting] = useState<boolean>(false)
  const [isStopping, setIsStopping] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('token') || ''
      setToken(stored)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    const fetchEntries = async () => {
      setIsFetching(true)
      setError(null)
      try {
        const res = await fetch('/.netlify/functions/get-time-entries', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          throw new Error(`Fetch entries failed: ${res.status} ${res.statusText}`)
        }
        const data: TimeEntry[] = await res.json()
        setEntries(data)
        const active = data.find((e) => e.endTime === null) || null
        setRunningEntry(active)
      } catch (err) {
        console.error(err)
        setError((err as Error).message)
      } finally {
        setIsFetching(false)
      }
    }
    fetchEntries()
  }, [token])

  useEffect(() => {
    if (runningEntry) {
      const startMs = new Date(runningEntry.startTime).getTime()
      const initSec = Math.floor((Date.now() - startMs) / 1000)
      setCurrentSeconds(initSec)
      intervalRef.current = setInterval(() => {
        setCurrentSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setCurrentSeconds(0)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [runningEntry])

  const handleStart = async () => {
    if (isStarting) return
    setIsStarting(true)
    setError(null)
    try {
      const res = await fetch('/.netlify/functions/start-timer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw new Error(`Start failed: ${res.status} ${res.statusText}`)
      }
      const entry: TimeEntry = await res.json()
      setRunningEntry(entry)
      setEntries((prev) => [entry, ...prev])
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    if (isStopping || !runningEntry) return
    setIsStopping(true)
    setError(null)
    try {
      const res = await fetch('/.netlify/functions/stop-timer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: runningEntry.id }),
      })
      if (!res.ok) {
        throw new Error(`Stop failed: ${res.status} ${res.statusText}`)
      }
      const updated: TimeEntry = await res.json()
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setRunningEntry(null)
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setIsStopping(false)
    }
  }

  const finishedSum = entries.reduce((sum, e) => {
    if (e.endTime) {
      return sum + Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 1000)
    }
    return sum
  }, 0)
  const totalSeconds = finishedSum + (runningEntry ? currentSeconds : 0)

  return (
    <div>
      <h2>Time Tracker</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div>Total Time: {formatDuration(totalSeconds)}</div>
      <button
        onClick={runningEntry ? handleStop : handleStart}
        disabled={isFetching || isStarting || isStopping}
      >
        {isFetching && !runningEntry
          ? 'Loading...'
          : runningEntry
          ? isStopping
            ? 'Stopping...'
            : 'Stop'
          : isStarting
          ? 'Starting...'
          : 'Start'}
      </button>
      {runningEntry && <div>Current Session: {formatDuration(currentSeconds)}</div>}
      <ul>
        {entries.map((e) => {
          const duration = e.endTime
            ? Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 1000)
            : runningEntry && e.id === runningEntry.id
            ? currentSeconds
            : 0
          return (
            <li key={e.id}>
              {new Date(e.startTime).toLocaleString()} -{' '}
              {e.endTime ? new Date(e.endTime).toLocaleString() : 'Running'} ({formatDuration(duration)})
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default TimeTracker