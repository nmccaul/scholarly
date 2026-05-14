'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  grades: Array<number | null>
  pointsPossible: number
}

export default function GradeDistributionChart({ grades, pointsPossible }: Props) {
  const gradedGrades = grades.filter((g): g is number => g !== null)

  if (gradedGrades.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center">
        <p className="text-xs text-[#AEB8C2]">No graded submissions yet</p>
      </div>
    )
  }

  // Build 10-point percentage buckets: 0–9%, 10–19%, ... 90–100%
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: i === 9 ? '90–100' : `${i * 10}–${i * 10 + 9}`,
    count: 0,
  }))

  for (const grade of gradedGrades) {
    const pct = pointsPossible > 0 ? (grade / pointsPossible) * 100 : 0
    const bucketIndex = Math.min(Math.floor(pct / 10), 9)
    buckets[bucketIndex].count++
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={buckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
        <XAxis
          dataKey="range"
          tick={{ fontSize: 9, fill: '#8A8F98', fontFamily: 'monospace' }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#AEB8C2' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const d = payload[0].payload as { range: string; count: number }
            return (
              <div className="bg-white border border-[#E3E0D8] rounded-lg px-3 py-2 shadow-sm text-xs">
                <p className="font-medium text-[#18202A]">{d.range}%</p>
                <p className="text-[#6B7280]">{d.count} student{d.count !== 1 ? 's' : ''}</p>
              </div>
            )
          }}
          cursor={{ fill: '#F0EEE8' }}
        />
        <Bar dataKey="count" fill="#2563A6" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}
