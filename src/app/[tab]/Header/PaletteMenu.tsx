import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Palette,
  RotateCcw,
} from 'lucide-react'

import {
  Button,
} from '@/components/button'
import {
  SIGN_COLORS,
  SIGN_PALETTE,
} from '@/lib/palette'
import {
  usePalette,
} from '@/lib/palette-context'
import {
  cn,
} from '@/lib/utils'

/**
 * 标题栏里的色板设置。整个项目标志的颜色都从这份色板取，
 * 所以改这里就会一起变——各地厂家、反光膜、喷印设备做出来的同名颜色有色差，
 * 正是靠这个对齐。每种颜色都能挂若干色值（预设），点一下就套用。
 */
export default function PaletteMenu() {
  const [open, setOpen] = useState(false)
  const {
    palette, swatches, setColor, resetColor, resetPalette, addSwatch, removeSwatch,
  } = usePalette()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {return}
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {setOpen(false)}
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {setOpen(false)}
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const changedCount = SIGN_PALETTE
    .filter(entry => palette[entry.key].toUpperCase() !== SIGN_COLORS[entry.key].toUpperCase())
    .length

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
        title={changedCount > 0 ? `色板（已改 ${changedCount} 种颜色）` : '色板'}
      >
        <Palette className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">色板设置</span>
        {changedCount > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" />}
      </Button>
      {open && <div
        role="dialog"
        aria-label="色板设置"
        className="absolute right-0 top-full z-50 mt-1.5 w-[min(22rem,calc(100vw-2rem))] rounded-md border bg-background p-2.5 text-foreground shadow-lg"
      >
        <div className="flex items-baseline justify-between gap-2 px-0.5 pb-2">
          <div>
            <p className="text-xs font-medium">色板</p>
            <p className="text-[11px] text-muted-foreground">
              所有标志的颜色统一取自这里，改一种颜色全部一起变。
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            disabled={changedCount === 0}
            onClick={resetPalette}
            title="全部恢复默认颜色"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
        <ul className="max-h-[60dvh] space-y-0.5 overflow-y-auto pr-0.5">
          {SIGN_PALETTE.map((entry) => {
            const active = palette[entry.key]
            const isDefault = active.toUpperCase() === SIGN_COLORS[entry.key].toUpperCase()
            return <li
              key={entry.key}
              title={`${entry.name}：${entry.usage}`}
              className="flex items-center gap-1.5 rounded-sm px-1 py-1 hover:bg-accent/40"
            >
              <span className="w-12 shrink-0 truncate text-xs text-muted-foreground">
                {entry.name.replace(/色$/, '')}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {swatches[entry.key].map(hex => <button
                  key={hex}
                  type="button"
                  aria-label={`${entry.name} ${hex}`}
                  onClick={() => setColor(entry.key, hex)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    removeSwatch(entry.key, hex)
                  }}
                  title={hex}
                  className={cn(
                    'size-[1.125rem] shrink-0 rounded-sm border transition-shadow',
                    active.toUpperCase() === hex.toUpperCase()
                      ? 'border-primary ring-2 ring-ring/50'
                      : 'border-border/70 hover:ring-2 hover:ring-ring/25',
                  )}
                  style={{
                    backgroundColor: hex,
                  }}
                />)}
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {active.toUpperCase()}
              </span>
              <input
                type="color"
                aria-label={`${entry.name}自定义色值`}
                value={active}
                onChange={(event) => {
                  const hex = event.target.value.toUpperCase()
                  setColor(entry.key, hex)
                  addSwatch(entry.key, hex)
                }}
                className="size-6 shrink-0 cursor-pointer rounded-sm border border-border bg-background"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                disabled={isDefault}
                onClick={() => resetColor(entry.key)}
                title={`把${entry.name}恢复成默认色值 ${SIGN_COLORS[entry.key]}`}
              >
                <RotateCcw className="size-3" />
              </Button>
            </li>
          })}
        </ul>
        <p className="px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          点色块套用；取色器选的颜色会自动存成色板项；右键色块删除自定义项。
          颜色分类与「基本含义」按 GB 5768.2—2022 表&nbsp;1。
        </p>
      </div>}
    </div>
  )
}
