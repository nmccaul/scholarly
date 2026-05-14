'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface DataPoint {
  section: string
  title: string
  students: number
}

interface Props {
  data: DataPoint[]
  totalStudents: number
}

export default function CompletionFunnelChart({ data, totalStudents }: Props) {
  if (data.length === 0 || totalStudents === 0) {
    return <EmptyState />
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
        <XAxis
          dataKey="section"
          tick={{ fontSize: 11, fill: '#8A8F98', fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#AEB8C2' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, totalStudents]}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const d = payload[0].payload as DataPoint
            const pct = totalStudents > 0 ? Math.round((d.students / totalStudents) * 100) : 0
            return (
              <div className="bg-white border border-[#E3E0D8] rounded-lg px-3 py-2 shadow-sm text-xs">
                <p className="font-medium text-[#18202A] mb-0.5">{d.title}</p>
                <p className="text-[#6B7280]">{d.students} student{d.students !== 1 ? 's' : ''} reached ({pct}%)</p>
              </div>
            )
          }}
          cursor={{ fill: '#F0EEE8' }}
        />
        <Bar dataKey="students" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, i) => {
            const pct = totalStudents > 0 ? entry.students / totalStudents : 0
            const color = pct >= 0.7 ? '#34D399' : pct >= 0.4 ? '#FCD34D' : '#FCA5A5'
            return <Cell key={i} fill={color} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function EmptyState() {
  return (
    <div className="h-[180px] flex items-center justify-center">
      <p className="text-xs text-[#AEB8C2]">No data yet</p>
    </div>
  )
}
