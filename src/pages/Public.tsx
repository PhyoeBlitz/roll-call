import React, { useEffect, useState } from 'react'
import { loadAttendees, subscribeAttendees } from '../utils/storage'

export default function Public() {
    const [attendees, setAttendees] = useState(null)

            useEffect(() => {
                let mounted = true

                // initial load (fallback if ws is slow)
                ;(async () => {
                    try {
                        const items = await loadAttendees()
                        if (mounted) setAttendees(items)
                    } catch {}
                })()

                // live updates via WebSocket
                const unsub = subscribeAttendees(items => {
                    if (mounted) setAttendees(items)
                })

                // also react to localStorage changes (same-device edits)
                const onStorage = (e: StorageEvent) => {
                    if (e.key === 'rollcall.attendees') {
                        try {
                            const raw = e.newValue
                            if (raw) setAttendees(JSON.parse(raw))
                        } catch {}
                    }
                }
                window.addEventListener('storage', onStorage)

                return () => {
                    mounted = false
                    unsub()
                    window.removeEventListener('storage', onStorage)
                }
            }, [])

    if (!attendees) return <div className="p-4"><h2 className="text-lg font-semibold">出席状況</h2><p>読み込み中...</p></div>

    const total = attendees.length
    const attending = attendees.filter(a => a.attending).length
    const not = attendees.filter(a => !a.attending).length

    // late: attending && checkedAt > 09:00 local time
    const late = attendees.filter(a => {
        if (!a.attending || !a.checkedAt) return false
        try {
            const d = new Date(a.checkedAt)
            // compare local hours
            const h = d.getHours()
            const m = d.getMinutes()
            return (h > 9) || (h === 9 && m > 0)
        } catch {
            return false
        }
    }).length

    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-gray-600">リアルタイム出席状況</p>
            </div>

            <div className="text-sm text-gray-900 space-y-1">
                <div>
                    <span className="text-gray-600">総数</span> = <span className="font-semibold">{total}</span>
                </div>
                <div>
                    <span className="text-gray-600">出席</span> = <span className="font-semibold text-green-700">{attending}</span>
                </div>
                <div>
                    <span className="text-gray-600">欠席</span> = <span className="font-semibold text-red-700">{not}</span>
                </div>
                <div>
                    <span className="text-gray-600">遅刻</span> = <span className="font-semibold text-yellow-700">{late}</span>
                </div>
            </div>

            {/* <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">出席者一覧</h3>
                </div>
                <div className="overflow-auto max-h-96">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">社員番号</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">読み仮名</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属部署</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">国籍</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">出欠状況</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {attendees.map((a) => (
                                <tr
                                    key={a.employeeId}
                                    className={`hover:bg-gray-50 ${a.attending ? 'bg-green-50' : 'bg-white'}`}
                                >
                                    <td className="px-4 py-3 text-sm text-gray-900">{a.employeeId || '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full ${a.attending ? 'bg-green-600' : 'bg-gray-400'} text-white flex items-center justify-center text-xs font-bold`}>
                                                {a.name ? a.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{a.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{a.kana || '—'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {a.group ? (
                                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                {a.group}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {a.nationality ? (
                                            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                                {a.nationality}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {a.attending ? (
                                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                ✅ 出席
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                                                ❌ 欠席
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div> */}
        </div>
    )
}
