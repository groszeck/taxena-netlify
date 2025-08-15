const CalendarPage = (): JSX.Element => {
  const { user, tenantId, getToken } = useContext(AuthContext)
  const mountedRef = useRef(true)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadEvents = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetchWithAuth(
        `/api/events?tenantId=${tenantId}`,
        { method: 'GET' },
        token
      )
      if (!res.ok) {
        let msg = 'Failed to fetch events'
        try {
          const errJson = await res.json()
          msg = errJson.message || errJson.error || msg
        } catch {}
        throw new Error(msg)
      }
      const data: CalendarEvent[] = await res.json()
      if (!mountedRef.current) return
      setEvents(data)
    } catch (err: any) {
      if (!mountedRef.current) return
      setError(err.message || 'Unknown error')
    } finally {
      if (!mountedRef.current) return
      setLoading(false)
    }
  }, [tenantId, getToken])

  useEffect(() => {
    if (user && tenantId) {
      loadEvents()
    }
  }, [user, tenantId, loadEvents])

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedRange({
      start: selectInfo.startStr,
      end: selectInfo.endStr
    })
    setSelectedEvent(null)
    setModalOpen(true)
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const ev = clickInfo.event
    setSelectedEvent({
      id: ev.id,
      title: ev.title,
      start: ev.startStr,
      end: ev.endStr,
      allDay: ev.allDay
    })
    setSelectedRange(null)
    setModalOpen(true)
  }

  const handleEventSave = async (eventData: {
    id?: string
    title: string
    start: string
    end: string
    allDay: boolean
  }) => {
    if (!mountedRef.current) return
    setIsSaving(true)
    try {
      const token = await getToken()
      const method = eventData.id ? 'PUT' : 'POST'
      const url = eventData.id
        ? `/api/events/${eventData.id}`
        : '/api/events'
      const body = { ...eventData, tenantId }
      const res = await fetchWithAuth(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        },
        token
      )
      if (!res.ok) {
        let msg = 'Failed to save event'
        try {
          const errJson = await res.json()
          msg = errJson.message || errJson.error || msg
        } catch {}
        throw new Error(msg)
      }
      await loadEvents()
      if (!mountedRef.current) return
      setModalOpen(false)
    } catch (err: any) {
      if (mountedRef.current) {
        alert(err.message || 'Error saving event')
      }
    } finally {
      if (mountedRef.current) {
        setIsSaving(false)
      }
    }
  }

  const handleEventDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return
    if (!mountedRef.current) return
    setIsDeleting(true)
    try {
      const token = await getToken()
      const res = await fetchWithAuth(
        `/api/events/${id}`,
        { method: 'DELETE' },
        token
      )
      if (!res.ok) {
        let msg = 'Failed to delete event'
        try {
          const errJson = await res.json()
          msg = errJson.message || errJson.error || msg
        } catch {}
        throw new Error(msg)
      }
      await loadEvents()
      if (!mountedRef.current) return
      setModalOpen(false)
    } catch (err: any) {
      if (mountedRef.current) {
        alert(err.message || 'Error deleting event')
      }
    } finally {
      if (mountedRef.current) {
        setIsDeleting(false)
      }
    }
  }

  const handleDatesSet = (arg: { startStr: string; endStr: string }) => {
    // optionally fetch events for visible range
  }

  if (loading) return <LoadingSpinner />
  if (error) return <div className="error">{error}</div>

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={events}
        selectable={true}
        selectMirror={true}
        select={handleDateSelect}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        editable={false}
        height="auto"
      />
      {modalOpen && (
        <EventModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleEventSave}
          onDelete={selectedEvent ? () => handleEventDelete(selectedEvent.id) : undefined}
          event={selectedEvent}
          range={selectedRange}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      )}
    </>
  )
}

export default CalendarPage