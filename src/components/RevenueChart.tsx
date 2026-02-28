'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MonthlyData {
    month: string;
    revenus: number;
    depenses: number;
}

interface RevenueChartProps {
    data: MonthlyData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Pas de données disponibles
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                        dataKey="month"
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                        tickFormatter={(v) => `${v}€`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#1a1f36',
                            border: '1px solid rgba(43,140,238,0.2)',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                        }}
                        formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(2)} €`]}
                    />
                    <Legend />
                    <Bar dataKey="revenus" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenus" />
                    <Bar dataKey="depenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
