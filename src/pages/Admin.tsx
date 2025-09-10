import React, { useState, useEffect, useMemo } from 'react'
import { loadAttendees, saveAttendees } from '../utils/storage'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

export default function Admin() {
  const [attendees, setAttendees] = useState([])
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [kana, setKana] = useState('')
  const [group, setGroup] = useState('')
  const [nationality, setNationality] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const items = await loadAttendees()
      if (!mounted) return
      setAttendees(items)
    })()
    return () => { mounted = false }
  }, [])

  async function persist(items) {
    setAttendees(items)
    await saveAttendees(items)
  }

  const filteredAttendees = useMemo(() => {
    const q = (search || '').trim().toLowerCase()
    if (!q) return attendees
    return attendees.filter(a => {
      const hay = `${a.employeeId || ''} ${a.name || ''} ${a.kana || ''} ${a.group || ''} ${a.nationality || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [attendees, search])

  // quick stats
  const total = attendees.length
  const attendingCount = attendees.filter(a => a.attending).length
  const notCount = attendees.filter(a => !a.attending).length
  const lateCount = attendees.filter(a => {
    if (!a.attending || !a.checkedAt) return false
    try {
      const d = new Date(a.checkedAt)
      const h = d.getHours()
      const m = d.getMinutes()
      return h > 9 || (h === 9 && m > 0)
    } catch {
      return false
    }
  }).length

  async function add() {
    if (!name.trim()) return
    let eid = employeeId.trim() || `GEN-${Date.now()}`
    // ensure uniqueness
    if (attendees.some(a => a.employeeId === eid)) {
      window.alert('Employee ID already exists — choose a different 社員番号 or edit the existing record.')
      return
    }
    const item = {
      employeeId: eid,
      name: name.trim(),
      kana: kana.trim() || undefined,
      group: group.trim() || undefined,
      nationality: nationality.trim() || undefined,
      attending: false
    }
    await persist([...attendees, item])
    setName('')
    setEmployeeId('')
    setKana('')
    setGroup('')
    setNationality('')
  }

  async function toggle(eid: string) {
    const next = attendees.map(a => a.employeeId === eid ? ({ ...a, attending: !a.attending, checkedAt: !a.attending ? new Date().toISOString() : null }) : a)
    await persist(next)
  }

  async function remove(eid: string) {
    const next = attendees.filter(a => a.employeeId !== eid)
    await persist(next)
  }

  // markNotAttending removed

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
        <p className="text-gray-600">Manage attendees and track participation</p>
      </div>

      {/* simple stats summary */}
      <div className="text-sm text-gray-900 space-y-1">
        <div>
          <span className="text-gray-600">Total</span> = <span className="font-semibold">{total}</span>
        </div>
        <div>
          <span className="text-gray-600">Attending</span> = <span className="font-semibold text-green-700">{attendingCount}</span>
        </div>
        <div>
          <span className="text-gray-600">Not attending</span> = <span className="font-semibold text-red-700">{notCount}</span>
        </div>
        <div>
          <span className="text-gray-600">Late</span> = <span className="font-semibold text-yellow-700">{lateCount}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Attendee</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={employeeId} 
            onChange={e => setEmployeeId(e.target.value)} 
            placeholder="Employee ID" 
          />
          <input 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Full Name" 
          />
          <input 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={kana} 
            onChange={e => setKana(e.target.value)} 
            placeholder="Kana Reading" 
          />
          <input 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={group} 
            onChange={e => setGroup(e.target.value)} 
            placeholder="Department" 
          />
          <input 
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={nationality} 
            onChange={e => setNationality(e.target.value)} 
            placeholder="Nationality" 
          />
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors" 
            onClick={add}
          >
            Add Person
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Data</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors" onClick={async () => {
          const wb = new ExcelJS.Workbook()
          const sheet = wb.addWorksheet('attendees')
          sheet.columns = [
            { header: '社員番号', key: 'employeeId', width: 15 },
            { header: '氏名', key: 'name', width: 20 },
            { header: '読み仮名', key: 'kana', width: 20 },
            { header: '所属グループ', key: 'group', width: 20 },
            { header: '国籍', key: 'nationality', width: 12 },
            { header: '出欠', key: 'attending', width: 10 }
          ]

          // header styling: light green fill and border
          sheet.getRow(1).eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
            cell.font = { bold: true }
          })

          attendees.forEach(a => {
            sheet.addRow({
              employeeId: a.employeeId || '',
              name: a.name,
              kana: a.kana || '',
              group: a.group || '',
              nationality: a.nationality || '',
              attending: a.attending ? '出席' : '欠席'
            })
          })

          const buf = await wb.xlsx.writeBuffer()
          const blob = new Blob([buf], { type: 'application/octet-stream' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'attendees.xlsx'
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }}>
          Export Excel
        </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Search & Filter</h3>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search by name, ID, group, or nationality..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded-md font-medium transition-colors border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => setSearch('')}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">File Upload</h3>
        <label className="block mb-3 text-sm text-gray-600">Upload Excel file with columns: Employee ID, Name, Kana, Group, Nationality</label>
        <input 
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
          type="file" 
          accept=".xlsx,.xls,.csv" 
          onChange={async e => {
          const f = e.target.files && e.target.files[0]
          if (!f) return
          const buf = await f.arrayBuffer()
          const wb = XLSX.read(buf, {type:'array'})
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(sheet, {defval: ''})
          // Map rows to attendees
          const parsed = rows.map(r => ({
            employeeId: String(r['社員番号'] || r['employeeId'] || r['Employee ID'] || '').trim(),
            name: String(r['氏名'] || r['name'] || r['Name'] || '').trim(),
            kana: String(r['読み仮名'] || r['kana'] || '').trim(),
            group: String(r['所属グループ'] || r['group'] || '').trim(),
            nationality: String(r['国籍'] || r['nationality'] || '').trim(),
            attending: !!r['出欠'] ? (String(r['出欠']).includes('出') || String(r['出欠']).includes('✅') || String(r['出欠']).toLowerCase().includes('true')) : false
          }))

          // Deduplicate: skip rows whose employeeId already exists. Generate a surrogate if employeeId is empty.
          const existing = new Set(attendees.map(a => a.employeeId))
          const toAdd = []
          let skipped = 0
          for (const p of parsed) {
            let eidRow = p.employeeId || ''
            if (!eidRow) {
              // generate a stable-ish surrogate
              eidRow = `GEN-${Date.now()}-${Math.random().toString(36).slice(2,5)}`
            }
            // ensure uniqueness by regenerating if collision
            while (existing.has(eidRow)) {
              // if incoming row had an explicit employeeId and it's taken, skip it
              if (p.employeeId) { eidRow = null; break }
              eidRow = `GEN-${Date.now()}-${Math.random().toString(36).slice(2,5)}`
            }
            if (!eidRow) { skipped++; continue }
            existing.add(eidRow)
            toAdd.push({ employeeId: eidRow, name: p.name || '', kana: p.kana || undefined, group: p.group || undefined, nationality: p.nationality || undefined, attending: !!p.attending })
          }

          if (toAdd.length === 0) {
            window.alert(`No new rows were added. ${skipped ? `${skipped} duplicate(s) were skipped.` : ''}`)
            return
          }

          await persist([...attendees, ...toAdd])
          if (skipped) window.alert(`${toAdd.length} rows added, ${skipped} duplicate(s) skipped.`)
        }} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm">
          Showing <span className="font-semibold text-indigo-600">{filteredAttendees.length}</span> of <span className="font-semibold">{attendees.length}</span> attendees
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredAttendees.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl font-semibold text-gray-600 mb-2">No attendees found</div>
            <div className="text-gray-500">Try adjusting your search or add some attendees</div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kana</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAttendees.map((a) => (
                  <tr key={a.employeeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{a.employeeId || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.kana || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {a.group ? (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{a.group}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {a.nationality ? (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">{a.nationality}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.attending ? (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">✅ Attending</span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">❌ Not attending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-md border text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            a.attending
                              ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
                              : 'border-green-300 text-green-700 hover:bg-green-50'
                          }`}
                          onClick={() => toggle(a.employeeId)}
                        >
                          {a.attending ? '❌ Mark not attending' : '✅ Mark attending'}
                        </button>
                        <button
                          className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          onClick={() => remove(a.employeeId)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
