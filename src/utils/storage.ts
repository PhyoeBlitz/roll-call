const KEY = 'rollcall.attendees'

export type Attendee = {
  employeeId: string; // 社員番号 (primary key)
  name: string; // 氏名
  kana?: string; // 読み仮名
  group?: string; // 所属グループ
  nationality?: string; // 国籍
  attending: boolean
  // notattending removed — use attending=false to indicate not attending
  checkedAt?: string // ISO timestamp when marked attending
}

async function fetchFromServer(path: string, options) {
  try {
    const res = await fetch(`http://localhost:4000${path}`, options)
    if (!res.ok) throw new Error('server error')
    return await res.json()
  } catch (err) {
    throw err
  }
}

export async function loadAttendees(): Promise<Attendee[]> {
  // Try server first
  try {
    const data = await fetchFromServer('/api/attendees', { method: 'GET' })
    return data || []
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return []
      return JSON.parse(raw) as Attendee[]
    } catch {
      return []
    }
  }
}

export async function saveAttendees(items: Attendee[]) {
  // Update server (best effort)
  try {
    await fetchFromServer('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) })
  } catch {
    // ignore server errors
  }

  // Always update localStorage as a fallback
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {}
}
