import React, { useEffect, useState } from 'react'
import { loadAttendees } from '../utils/storage'

export default function Public() {
    const [attendees, setAttendees] = useState(null)

    useEffect(() => {
        let mounted = true
            ; (async () => {
                const items = await loadAttendees()
                if (!mounted) return
                setAttendees(items)
            })()
        return () => { mounted = false }
    }, [])

    if (!attendees) return <div className="p-4"><h2 className="text-lg font-semibold">Public</h2><p>Loading...</p></div>

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
                <p className="text-gray-600">Real-time attendance overview</p>
            </div>

            <div className="text-sm text-gray-900 space-y-1">
                <div>
                    <span className="text-gray-600">Total</span> = <span className="font-semibold">{total}</span>
                </div>
                <div>
                    <span className="text-gray-600">Attending</span> = <span className="font-semibold text-green-700">{attending}</span>
                </div>
                <div>
                    <span className="text-gray-600">Not attending</span> = <span className="font-semibold text-red-700">{not}</span>
                </div>
                <div>
                    <span className="text-gray-600">Late</span> = <span className="font-semibold text-yellow-700">{late}</span>
                </div>
            </div>

            {/* <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Attendance List</h3>
                </div>
                <div className="overflow-auto max-h-96">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kana</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                                                ✅ Present
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                                                ❌ Not attending
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
