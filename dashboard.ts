let revenueChart: Chart | null = null

function showLoader(): void {
  const loader = document.getElementById('loader')
  if (loader) loader.classList.remove('hidden')
}

function hideLoader(): void {
  const loader = document.getElementById('loader')
  if (loader) loader.classList.add('hidden')
}

async function fetchDashboardData(): Promise<DashboardData> {
  const res = await fetch('/api/dashboard', {
    credentials: 'include'
  })
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
    let errJson: any = null
    try {
      errJson = await res.json()
    } catch {}
    throw new Error(errJson?.message || 'Failed to load dashboard data')
  }
  const data = await res.json()
  if (
    typeof data.totalCompanies !== 'number' ||
    typeof data.totalContacts !== 'number' ||
    typeof data.totalTasks !== 'number' ||
    !Array.isArray(data.monthlyRevenue) ||
    data.monthlyRevenue.some(m => typeof m !== 'number')
  ) {
    throw new Error('Invalid dashboard data format')
  }
  return data as DashboardData
}

function renderStats(data: DashboardData): void {
  const container = document.getElementById('stats-cards')
  if (!container) return
  container.innerHTML = ''
  const stats = [
    { label: 'Companies', value: data.totalCompanies },
    { label: 'Contacts', value: data.totalContacts },
    { label: 'Tasks', value: data.totalTasks }
  ]
  for (const { label, value } of stats) {
    const card = document.createElement('div')
    card.className = 'stat-card'
    card.innerHTML = `
      <h3>${value}</h3>
      <p>${label}</p>
    `
    container.appendChild(card)
  }
}

function renderRevenueChart(monthly: number[]): void {
  const canvas = document.getElementById('revenue-chart') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  if (revenueChart) {
    revenueChart.destroy()
    revenueChart = null
  }
  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ],
      datasets: [{
        label: 'Revenue',
        data: monthly,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  })
}

export async function initDashboard(): Promise<void> {
  showLoader()
  try {
    const data = await fetchDashboardData()
    renderStats(data)
    renderRevenueChart(data.monthlyRevenue)
  } catch (err: any) {
    const msg = err.message || 'Unexpected error'
    showToast(msg, 'error')
  } finally {
    hideLoader()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard()
})