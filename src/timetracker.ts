async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  const token = localStorage.getItem('token')
  const headers = new Headers(init?.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(input, { ...init, headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Request failed ${res.status}: ${body}`)
  }
  return res.json()
}

export function initTimeTracker(options?: TimeTrackerOptions) {
  const subscribers = new Set<TimeTrackerOptions['onUpdate']>()
  const entriesRef = { current: [] as TimeEntry[] }
  const timerRef = { current: null as CurrentTimer | null }
  let intervalId: number | null = null

  function notify() {
    subscribers.forEach(fn => {
      try {
        fn(entriesRef.current, timerRef.current)
      } catch (e) {
        console.error('Error in subscriber callback', e)
      }
    })
  }

  async function loadEntries() {
    try {
      const data = await fetchWithAuth('/.netlify/functions/get-time-entries')
      entriesRef.current = data as TimeEntry[]
      notify()
    } catch (err) {
      console.error('Failed to load time entries', err)
      throw err
    }
  }

  async function start(projectId: string) {
    try {
      if (timerRef.current) {
        await stop()
      }
      const now = new Date()
      const created = await fetchWithAuth(
        '/.netlify/functions/create-time-entry',
        {
          method: 'POST',
          body: JSON.stringify({ projectId, startTime: now.toISOString() })
        }
      )
      timerRef.current = {
        id: created.id,
        projectId,
        startTime: now,
        elapsedMs: 0
      }
      notify()
      intervalId = window.setInterval(() => {
        if (timerRef.current) {
          timerRef.current.elapsedMs =
            Date.now() - timerRef.current.startTime.getTime()
          notify()
        }
      }, 1000)
      await loadEntries()
    } catch (err) {
      console.error('Failed to start timer', err)
      if (intervalId != null) {
        clearInterval(intervalId)
        intervalId = null
      }
      timerRef.current = null
      notify()
      throw err
    }
  }

  async function stop() {
    if (!timerRef.current) return
    try {
      const endTime = new Date()
      await fetchWithAuth(
        '/.netlify/functions/update-time-entry',
        {
          method: 'PATCH',
          body: JSON.stringify({
            id: timerRef.current.id,
            endTime: endTime.toISOString()
          })
        }
      )
      if (intervalId != null) {
        clearInterval(intervalId)
        intervalId = null
      }
      timerRef.current = null
      await loadEntries()
    } catch (err) {
      console.error('Failed to stop timer', err)
      throw err
    }
  }

  function subscribe(fn: TimeTrackerOptions['onUpdate']) {
    subscribers.add(fn)
    try {
      fn(entriesRef.current, timerRef.current)
    } catch (e) {
      console.error('Error in subscriber callback', e)
    }
    return () => subscribers.delete(fn)
  }

  // initialize
  loadEntries().catch(err => {
    console.error('Initialization loadEntries failed', err)
  })
  if (options?.onUpdate) {
    subscribe(options.onUpdate)
  }

  return {
    start,
    stop,
    getEntries: () => entriesRef.current.slice(),
    getCurrent: () => timerRef.current,
    subscribe
  }
}