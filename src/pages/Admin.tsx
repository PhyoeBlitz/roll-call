import React, { useState, useEffect, useMemo } from 'react'
import { loadAttendees, saveAttendees, defaultSettings } from '../utils/storage'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'

const Admin: React.FC = () => {
  const [attendees, setAttendees] = useState([])
  const [publicColumns, setPublicColumns] = useState(defaultSettings.publicColumns)
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [kana, setKana] = useState('')
  const [group, setGroup] = useState('')
  const [nationality, setNationality] = useState('')
  const [search, setSearch] = useState('')
  const [settingsWs, setSettingsWs] = useState<WebSocket | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        const items = await loadAttendees()
        if (!mounted) return
        setAttendees(items)
      })()
    // WebSocket for settings
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/rollcall-ws'
    const ws = new WebSocket(wsUrl)
    setSettingsWs(ws)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'loadSettings' }))
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg && msg.type === 'publicSettings' && typeof msg.data === 'object') {
          if (msg.data.publicColumns && typeof msg.data.publicColumns === 'object') setPublicColumns(msg.data.publicColumns)
        }
      } catch { }
    }
    return () => { mounted = false; ws.close() }
  }, [])
  function handleColumnToggle(key: string, checked: boolean) {
    const newCols = { ...publicColumns, [key]: checked }
    setPublicColumns(newCols)
    if (settingsWs && settingsWs.readyState === WebSocket.OPEN) {
      settingsWs.send(JSON.stringify({ type: 'saveSettings', data: { publicColumns: newCols } }))
    }
  }

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
      window.alert('社員番号が既に存在します — 別の社員番号を選択するか、既存のレコードを編集してください。')
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
        <h2 className="text-3xl font-bold text-gray-900 mb-2">管理画面</h2>
        <p className="text-gray-600">出席者管理と参加状況追跡</p>
      </div>

      {/* 公開カラム設定 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border flex flex-wrap items-center gap-4">
        <span className="text-gray-800 font-medium mr-2">公開画面に表示するカラム:</span>
        {[
          { key: 'employeeId', label: '社員番号' },
          { key: 'name', label: '氏名' },
          { key: 'kana', label: '読み仮名' },
          { key: 'group', label: '所属部署' },
          { key: 'nationality', label: '国籍' },
          { key: 'attending', label: '出欠状況' },
        ].map(col => (
          <label key={col.key} className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={!!publicColumns[col.key]}
              onChange={e => handleColumnToggle(col.key, e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="text-xs text-gray-700">{col.label}</span>
          </label>
        ))}
      </div>
      <div className="text-sm text-gray-900 space-y-1">
        <div>
          <span className="text-gray-600">総数</span> = <span className="font-semibold">{total}</span>
        </div>
        <div>
          <span className="text-gray-600">出席</span> = <span className="font-semibold text-green-700">{attendingCount}</span>
        </div>
        <div>
          <span className="text-gray-600">欠席</span> = <span className="font-semibold text-red-700">{notCount}</span>
        </div>
        <div>
          <span className="text-gray-600">遅刻</span> = <span className="font-semibold text-yellow-700">{lateCount}</span>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">新規出席者追加</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            placeholder="社員番号"
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="氏名"
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={kana}
            onChange={e => setKana(e.target.value)}
            placeholder="読み仮名"
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={group}
            onChange={e => setGroup(e.target.value)}
            placeholder="所属部署"
          />
          <input
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={nationality}
            onChange={e => setNationality(e.target.value)}
            placeholder="国籍"
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            onClick={add}
          >
            人員追加
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">データエクスポート</h3>
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
              { header: '出欠', key: 'attending', width: 10 },
              { header: 'チェック時刻', key: 'checkedAt', width: 20 }
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
              const checkedAtFormatted = a.checkedAt
                ? new Date(a.checkedAt).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
                : ''

              sheet.addRow({
                employeeId: a.employeeId || '',
                name: a.name,
                kana: a.kana || '',
                group: a.group || '',
                nationality: a.nationality || '',
                attending: a.attending ? '出席' : '欠席',
                checkedAt: checkedAtFormatted
              })
            })

            // Add summary rows
            const attendingCount = attendees.filter(a => a.attending).length
            const notAttendingCount = attendees.filter(a => !a.attending).length

            // Empty row for spacing
            sheet.addRow({})

            // Summary rows
            const totalAttendingRow = sheet.addRow({
              employeeId: '',
              name: '合計出席者',
              kana: '',
              group: '',
              nationality: '',
              attending: attendingCount.toString(),
              checkedAt: ''
            })

            const totalNotAttendingRow = sheet.addRow({
              employeeId: '',
              name: '合計欠席者',
              kana: '',
              group: '',
              nationality: '',
              attending: notAttendingCount.toString(),
              checkedAt: ''
            })

            // Style summary rows
            totalAttendingRow.eachCell((cell) => {
              cell.font = { bold: true }
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3E6' } }
            })

            totalNotAttendingRow.eachCell((cell) => {
              cell.font = { bold: true }
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE6E6' } }
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
            Excelエクスポート
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">検索・フィルター</h3>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="氏名、ID、部署、国籍で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded-md font-medium transition-colors border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            onClick={() => setSearch('')}
          >
            クリア
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">ファイルアップロード</h3>
        <label className="block mb-3 text-sm text-gray-600">社員番号、氏名、読み仮名、部署、国籍の列を含むExcelファイルをアップロード</label>
        <input
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={async e => {
            const f = e.target.files && e.target.files[0]
            if (!f) return
            const buf = await f.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'array' })
            const sheet = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
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
                eidRow = `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
              }
              // ensure uniqueness by regenerating if collision
              while (existing.has(eidRow)) {
                // if incoming row had an explicit employeeId and it's taken, skip it
                if (p.employeeId) { eidRow = null; break }
                eidRow = `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
              }
              if (!eidRow) { skipped++; continue }
              existing.add(eidRow)
              toAdd.push({ employeeId: eidRow, name: p.name || '', kana: p.kana || undefined, group: p.group || undefined, nationality: p.nationality || undefined, attending: !!p.attending })
            }

            if (toAdd.length === 0) {
              window.alert(`新しい行は追加されませんでした。${skipped ? `${skipped}件の重複がスキップされました。` : ''}`)
              return
            }

            await persist([...attendees, ...toAdd])
            if (skipped) window.alert(`${toAdd.length}行が追加され、${skipped}件の重複がスキップされました。`)
          }} />
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg shadow-sm">
          <span className="font-semibold">{attendees.length}</span>名中
          <span className="font-semibold text-indigo-600">{filteredAttendees.length}</span>名を表示
        </div>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
          onClick={
            () => {
              setShowDeleteModal(true)
            }
          }
        >
          一括削除
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredAttendees.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-xl font-semibold text-gray-600 mb-2">出席者が見つかりません</div>
            <div className="text-gray-500">検索条件を調整するか、出席者を追加してください</div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">社員番号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">読み仮名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属部署</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">国籍</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出欠状況</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">チェック時刻</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
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
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">✅ 出席</span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">❌ 欠席</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {a.checkedAt ? (
                        <div>
                          <div>{new Date(a.checkedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(a.checkedAt).toLocaleTimeString()}</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-md border text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${a.attending
                            ? 'border-orange-300 text-orange-700 hover:bg-orange-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                            }`}
                          onClick={() => toggle(a.employeeId)}
                        >
                          {a.attending ? '❌ 欠席にする' : '✅ 出席にする'}
                        </button>
                        <button
                          className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-sm font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          onClick={() => remove(a.employeeId)}
                        >
                          削除
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
      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <div className="text-lg font-semibold mb-4">確認</div>
            <div className="mb-6 text-gray-700">
              本当に全ての出席者を削除しますか？<br />
              この操作は元に戻せません。
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setShowDeleteModal(false)}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  await persist([])
                  setShowDeleteModal(false)
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin