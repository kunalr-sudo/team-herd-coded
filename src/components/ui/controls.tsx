import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useId, type ReactNode } from 'react'
import { SPRING } from './spring'


/** iOS-style switch. Knob position is a spring, so rapid toggling never jumps. */
export function Switch({ on, onChange, label, tone = 'green' }: { on: boolean; onChange: (v: boolean) => void; label: string; tone?: 'green' | 'red' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!on)
      }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${
        on ? (tone === 'red' ? 'bg-red-500' : 'bg-emerald-500') : 'bg-white/[0.16]'
      }`}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.35)]"
        animate={{ x: on ? 20 : 0 }}
        transition={SPRING}
      />
    </button>
  )
}

/** Segmented control with a sliding selection pill. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const group = useId()
  return (
    <div className="flex rounded-[10px] bg-white/[0.08] p-[2px]" role="radiogroup">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            key={o.id}
            onClick={(e) => {
              e.stopPropagation()
              onChange(o.id)
            }}
            className={`relative flex-1 rounded-[8px] px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${active ? 'text-slate-950' : 'text-slate-300 hover:text-white'}`}
          >
            {active && <motion.span layoutId={`seg-${group}`} className="absolute inset-0 rounded-[8px] bg-white shadow-sm" transition={SPRING} />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const TILE = {
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
  blue: 'bg-sky-500',
  purple: 'bg-violet-500',
  slate: 'bg-slate-500',
  teal: 'bg-teal-500',
}

export function IconTile({ color, children }: { color: keyof typeof TILE; children: ReactNode }) {
  return <span className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] text-white ${TILE[color]}`}>{children}</span>
}

/** Grouped-list row: icon tile, title + subtitle, trailing accessory. Highlights on press like an iOS table cell. */
export function Row({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  children,
  divider = true,
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: () => void
  children?: ReactNode
  divider?: boolean
}) {
  const body = (
    <>
      <div className="flex items-center gap-3 px-4 py-3">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight text-white">{title}</div>
          {subtitle && <div className="mt-0.5 text-[13px] leading-snug text-slate-400">{subtitle}</div>}
        </div>
        {trailing}
      </div>
      {children && <div className="px-4 pb-3.5">{children}</div>}
      {divider && <div className="ml-[58px] h-px bg-white/[0.07]" />}
    </>
  )
  if (!onClick) return <div>{body}</div>
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer outline-none transition-colors duration-100 first:rounded-t-[18px] last:rounded-b-[18px] hover:bg-white/[0.03] focus-visible:bg-white/[0.06] active:bg-white/[0.09]"
    >
      {body}
    </div>
  )
}

/** A number that springs to its new value instead of jumping. */
export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('en-US') }: { value: number; format?: (v: number) => string }) {
  const mv = useSpring(value, { bounce: 0, duration: 0.6 })
  const text = useTransform(mv, format)
  useEffect(() => {
    mv.set(value)
  }, [mv, value])
  return <motion.span className="tabular-nums">{text}</motion.span>
}

/** 0–100 % slider in fixed steps, with tick marks so each step is visible. */
export function StepSlider({
  value,
  onChange,
  label,
  step = 10,
  color = '#22d3ee',
}: {
  value: number
  onChange: (v: number) => void
  label: string
  step?: number
  color?: string
}) {
  const ticks = Array.from({ length: 100 / step + 1 }, (_, k) => k * step)
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <input
        type="range"
        min={0}
        max={100}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={`${value}%`}
        className="ios-slider"
        style={{ ['--fill' as string]: `${value}%`, ['--fill-bg' as string]: color }}
      />
      <div className="mx-[13px] -mt-1 flex justify-between" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className={`h-1 w-px ${t <= value ? 'bg-white/50' : 'bg-white/20'}`} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[11.5px] text-slate-500" aria-hidden>
        <span>Off</span>
        <span>50%</span>
        <span>Max</span>
      </div>
    </div>
  )
}
