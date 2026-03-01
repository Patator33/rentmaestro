'use client';

import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ReferenceLine
} from 'recharts';

interface CashflowData {
    month: string;
    revenus: number;
    depenses: number;
    net: number;
}

interface CashflowChartProps {
    data: CashflowData[];
}

export default function CashflowChart({ data }: CashflowChartProps) {
    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Pas de données de trésorerie disponibles
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <ComposedChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                        dataKey="month"
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickFormatter={(v) => `${v}€`}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            color: 'var(--text-color)',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                        formatter={(value: number | undefined) => [value !== undefined ? `${value.toFixed(2)} €` : '']}
                    />
                    <Legend verticalAlign="top" height={40} iconType="circle" />
                    <ReferenceLine y={0} stroke="var(--border-color)" />

                    <Bar
                        dataKey="revenus"
                        fill="#22c55e"
                        name="Loyers (Encaissements)"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                    />
                    <Bar
                        dataKey="depenses"
                        fill="#ef4444"
                        name="Charges (Sorties)"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                    />
                    <Line
                        type="monotone"
                        dataKey="net"
                        stroke="#2563eb"
                        name="Cashflow Net (Reste à vivre)"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
