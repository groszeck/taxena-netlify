const API_URL = import.meta.env.VITE_CONTEXT_PANEL_API_URL || '/.netlify/functions/contextPanel'

function isContextItem(obj: any): obj is ContextItem {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string'
  )
}

function isContextItemArray(data: any): data is ContextItem[] {
  return Array.isArray(data) && data.every(isContextItem)
}

export async function initContextPanel(): Promise<void> {
  const container = document.getElementById('context-panel')
  if (!container) return
  renderLoading(container)
  try {
    const response = await fetch(API_URL, { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Failed to load context: ${response.status}`)
    const data = await response.json()
    if (!isContextItemArray(data)) throw new Error('Invalid context data format')
    renderPanel(container, data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    renderError(container, message)
  }
}

function renderLoading(container: HTMLElement) {
  container.textContent = ''
  const spinner = document.createElement('div')
  spinner.className = 'cp-loading'
  spinner.textContent = 'Loading...'
  container.appendChild(spinner)
}

function renderError(container: HTMLElement, message: string) {
  container.textContent = ''
  const errorDiv = document.createElement('div')
  errorDiv.className = 'cp-error'
  errorDiv.textContent = message
  container.appendChild(errorDiv)
}

function renderPanel(container: HTMLElement, items: ContextItem[]) {
  container.textContent = ''
  let current: string | null = null
  try {
    current = localStorage.getItem('currentContext')
  } catch {
    current = null
  }
  const list = document.createElement('ul')
  list.className = 'cp-list'
  items.forEach(item => {
    const li = document.createElement('li')
    li.textContent = item.name
    li.dataset.id = item.id
    li.className = item.id === current ? 'cp-item cp-selected' : 'cp-item'
    li.addEventListener('click', () => selectContext(item.id))
    list.appendChild(li)
  })
  container.appendChild(list)
}

function selectContext(id: string) {
  try {
    localStorage.setItem('currentContext', id)
  } catch {}
  window.dispatchEvent(new CustomEvent('contextChange', { detail: { id } }))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContextPanel)
} else {
  initContextPanel()
}

export default initContextPanel