const ContextPanelContext = createContext<ContextPanelContextType | undefined>(
  undefined
)

export const ContextPanelProvider: FC<{ children: ReactNode }> = ({
  children
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState<string | undefined>(undefined)
  const [content, setContent] = useState<ReactNode | null>(null)

  const openContextPanel = useCallback(
    (panelTitle: string, panelContent: ReactNode) => {
      setTitle(panelTitle)
      setContent(panelContent)
      setIsOpen(true)
    },
    []
  )

  const closeContextPanel = useCallback(() => {
    setIsOpen(false)
    setContent(null)
    setTitle(undefined)
  }, [])

  return (
    <ContextPanelContext.Provider
      value={{ isOpen, title, content, openContextPanel, closeContextPanel }}
    >
      {children}
    </ContextPanelContext.Provider>
  )
}

export const useContextPanel = (): ContextPanelContextType => {
  const context = useContext(ContextPanelContext)
  if (!context) {
    throw new Error(
      'useContextPanel must be used within a ContextPanelProvider'
    )
  }
  return context
}

export const ContextPanel: FC = () => {
  const { isOpen, title, content, closeContextPanel } = useContextPanel()
  const overlayRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const previousActiveRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousActiveRef.current = document.activeElement as HTMLElement
      // move focus to close button after mount
      setTimeout(() => {
        closeBtnRef.current?.focus()
      }, 0)
    }
  }, [isOpen])

  // restore focus on unmount
  useEffect(() => {
    return () => {
      if (previousActiveRef.current) {
        previousActiveRef.current.focus()
      }
    }
  }, [])

  if (!isOpen) return null

  const onOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeContextPanel()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeContextPanel()
    }
  }

  return (
    <div
      ref={overlayRef}
      className="context-panel-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="context-panel-title"
      onMouseDown={onOverlayMouseDown}
      onKeyDown={onKeyDown}
    >
      <FocusTrap
        focusTrapOptions={{
          clickOutsideDeactivates: true,
          fallbackFocus: () => closeBtnRef.current || overlayRef.current!
        }}
      >
        <aside className="context-panel">
          <header className="context-panel-header">
            <h2
              id="context-panel-title"
              className="context-panel-title"
            >
              {title}
            </h2>
            <button
              id="context-panel-close"
              type="button"
              className="context-panel-close"
              aria-label="Close panel"
              onClick={closeContextPanel}
              ref={closeBtnRef}
            >
              ?
            </button>
          </header>
          <div className="context-panel-content">{content}</div>
        </aside>
      </FocusTrap>
    </div>
  )
}