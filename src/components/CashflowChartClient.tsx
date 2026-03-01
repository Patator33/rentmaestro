'use client';

import dynamic from 'next/dynamic';

const CashflowChart = dynamic(() => import('./CashflowChart'), { ssr: false });

export default CashflowChart;
