import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceDot, XAxis, YAxis } from 'recharts'
import { Panel, PanelTitle } from '@/components/PageHeader'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { stageStyle } from '@/features/deals/stages'
import { money, moneyShort } from '@/lib/format'
import type { FunnelStage, Month } from './api'

const tick = { fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--ink-muted)' }
const SIZE = { width: 420, height: 200 }

/** Every other month label, so twelve fit in a third of the row. */
function everyOther(months: Month[]) {
  return (_: string, i: number) => (i % 2 === 0 ? months[i]?.label ?? '' : '')
}

const revenueConfig = { won_value: { label: 'Revenue won', color: 'var(--series-won)' } } satisfies ChartConfig

export function RevenueChart({ months }: { months: Month[] }) {
  const peak = months.reduce((best, m, i) => (m.won_value > months[best].won_value ? i : best), 0)
  const data = months.map((m) => ({ ...m, name: `${m.label} ${m.year}` }))
  return (
    <Panel>
      <PanelTitle aside="Last 12 months">Revenue won</PanelTitle>
      <ChartContainer config={revenueConfig} className="aspect-auto h-[200px] w-full" initialDimension={SIZE} data-testid="revenue-chart">
        <AreaChart data={data} margin={{ top: 22, right: 28, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={tick} tickFormatter={everyOther(months)} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={(v: number) => moneyShort(v)} width={48} tickCount={3} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent labelKey="name" formatter={(v) => <span className="font-mono">{money(Number(v))}</span>} />} />
          <Area dataKey="won_value" type="linear" stroke="var(--color-won_value)" strokeWidth={2} fill="var(--color-won_value)" fillOpacity={0.12} dot={false} isAnimationActive={false} />
          {months[peak]?.won_value ? (
            <ReferenceDot
              x={months[peak].month}
              y={months[peak].won_value}
              r={4}
              fill="var(--color-won_value)"
              stroke="none"
              label={{ value: moneyShort(months[peak].won_value), position: 'top', fill: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}
            />
          ) : null}
        </AreaChart>
      </ChartContainer>
    </Panel>
  )
}

const wonLostConfig = {
  won_count: { label: 'Won', color: 'var(--series-won)' },
  lost_count: { label: 'Lost', color: 'var(--lost)' },
} satisfies ChartConfig

export function WonLostChart({ months }: { months: Month[] }) {
  const data = months.map((m) => ({ ...m, name: `${m.label} ${m.year}` }))
  return (
    <Panel>
      <PanelTitle
        aside={
          <span className="flex gap-3.5 text-xs">
            <span className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-series-won" aria-hidden /> Won
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-lost" aria-hidden /> Lost
            </span>
          </span>
        }
      >
        Deals won and lost
      </PanelTitle>
      <ChartContainer config={wonLostConfig} className="aspect-auto h-[200px] w-full" initialDimension={SIZE} data-testid="won-lost-chart">
        <BarChart data={data} margin={{ top: 22, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={tick} tickFormatter={everyOther(months)} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} width={28} />
          <ChartTooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltipContent labelKey="name" />} />
          <Bar dataKey="won_count" fill="var(--color-won_count)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="lost_count" fill="var(--color-lost_count)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
    </Panel>
  )
}

const funnelConfig = { value: { label: 'Value reaching the stage' } } satisfies ChartConfig

function FunnelTick({ x, y, payload, funnel }: { x?: number; y?: number; payload?: { value: string }; funnel: FunnelStage[] }) {
  const stage = funnel.find((f) => f.stage === payload?.value)
  if (!stage) return null
  return (
    <g transform={`translate(${x},${y})`}>
      <text y={12} textAnchor="middle" fontSize={12} fill="var(--ink-muted)">
        {stage.label}
      </text>
      {stage.share !== null ? (
        <text y={27} textAnchor="middle" fontSize={11} fontFamily="var(--font-mono)" fill="var(--ink-muted)">
          {stage.share}%
        </text>
      ) : null}
    </g>
  )
}

/** Vertical bars from New to Won: the value of deals that reached each stage, and the share carried on. */
export function FunnelChart({ funnel }: { funnel: FunnelStage[] }) {
  return (
    <Panel>
      <PanelTitle aside="Value reaching each stage">Sales funnel</PanelTitle>
      <ChartContainer config={funnelConfig} className="aspect-auto h-[200px] w-full" initialDimension={SIZE} data-testid="funnel-chart">
        <BarChart data={funnel} margin={{ top: 22, right: 0, left: 0, bottom: 0 }} barCategoryGap="10%">
          <XAxis dataKey="stage" tickLine={false} axisLine={false} interval={0} height={36} tick={(props: object) => <FunnelTick {...props} funnel={funnel} />} />
          <YAxis hide />
          <ChartTooltip
            cursor={{ fill: 'var(--hover)' }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, p) => (p?.[0]?.payload as FunnelStage | undefined)?.label ?? ''}
                formatter={(v, _n, item) => (
                  <span className="font-mono">
                    {money(Number(v))} · {(item.payload as FunnelStage).count} deals
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {funnel.map((f) => (
              <Cell key={f.stage} fill={stageStyle(f.stage).token} />
            ))}
            <LabelList dataKey="value" position="top" formatter={(v: unknown) => moneyShort(Number(v))} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, fill: 'var(--ink)' }} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </Panel>
  )
}
