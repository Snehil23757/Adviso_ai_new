import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface InteractiveChartProps {
  priceMultiplier: number; // 0.8 to 1.5
  marketingInvestment: number; // 0.5 to 2.0
  operatingEfficiency: number; // 0.8 to 1.5
}

export default function InteractiveChart({
  priceMultiplier,
  marketingInvestment,
  operatingEfficiency,
}: InteractiveChartProps) {
  // Compute simulated quarterly data based on sliding coefficients
  const data = useMemo(() => {
    const baselines = [
      { quarter: "Q1 Baseline", rev: 120, eff: 70 },
      { quarter: "Q2 Forecast", rev: 155, eff: 78 },
      { quarter: "Q3 Forecast", rev: 210, eff: 83 },
      { quarter: "Q4 Forecast", rev: 290, eff: 90 },
    ];

    return baselines.map((item, idx) => {
      // Compounding factors through the timeline
      const compoundFactor = (idx + 1) * 0.25;
      
      // Revenue calculation: Pricing impact (with a slight elasticity drop if price is too high)
      // High price slightly dampens volume unless offset by marketing
      const demandElasticity = priceMultiplier > 1.2 ? 0.85 : 0.95;
      const effectivePriceImpact = priceMultiplier * demandElasticity;
      
      // Marketing impact increases volume
      const marketingImpact = Math.sqrt(marketingInvestment);
      
      const revMultiplier = (effectivePriceImpact * 0.6 + marketingImpact * 0.4) * (1 + (operatingEfficiency - 1) * 0.15);
      const simulatedRevenue = Math.round(item.rev * Math.max(0.5, revMultiplier));

      // Efficiency calculation
      const effMultiplier = operatingEfficiency * 0.7 + (priceMultiplier * 0.1) + (1 / marketingInvestment) * 0.2;
      const simulatedEfficiency = Math.min(100, Math.round(item.eff * Math.max(0.6, effMultiplier)));

      return {
        quarter: item.quarter,
        "Base Revenue ($K)": item.rev,
        "Simulated Revenue ($K)": simulatedRevenue,
        "Operational Efficiency (%)": simulatedEfficiency,
      };
    });
  }, [priceMultiplier, marketingInvestment, operatingEfficiency]);

  return (
    <div className="w-full h-72 rounded-lg bg-brand-surface-secondary p-1 border border-brand-border">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#374151" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#374151" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4A63FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4A63FF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis
            dataKey="quarter"
            stroke="#6B7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0F172A",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#FFFFFF",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="Base Revenue ($K)"
            stroke="#4B5563"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#colorBase)"
          />
          <Area
            type="monotone"
            dataKey="Simulated Revenue ($K)"
            stroke="#4A63FF"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorSim)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
