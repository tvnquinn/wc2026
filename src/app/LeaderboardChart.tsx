'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function LeaderboardChart({ data, lines }: { data: any[], lines: { key: string, color: string }[] }) {
  if (data.length === 0 || lines.length === 0) {
    return (
      <div className="card text-center" style={{ padding: '3rem', opacity: 0.5 }}>
        <p>Not enough finished matches for a chart.</p>
      </div>
    )
  }

  return (
    <div className="card" style={{ height: '400px', width: '100%', marginBottom: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Score History</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
          <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} 
            itemStyle={{ color: 'var(--text)' }}
          />
          <Legend />
          {lines.map(line => (
            <Line 
              key={line.key}
              type="monotone" 
              dataKey={line.key} 
              stroke={line.color} 
              strokeWidth={3}
              activeDot={{ r: 8 }} 
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
