import {
  useSignColors,
} from '../sign-colors'
import {
  OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

// Colours come from the global palette (useSignColors): `plate` for the board,
// `border` for the white border and badge, `text` for lettering and symbols.

// GB 5768.2-2022 §4.6.5 and figure 3, in multiples of the board's character
// height h: blue margin (衬边) 0.1h, white border 0.1h, corner radii 0.4h /
// 0.3h / 0.2h for the board, the border's outer edge and its inner edge.
export const FRAME = {
  margin: 0.1,
  border: 0.1,
  radius: 0.4,
} as const

// Board edge to the inner edge of the white border, in h.
export const FRAME_INNER = FRAME.margin + FRAME.border

// Cardinal direction badge (figure 205, drawing E.167): a white square of 0.9h
// tucked into the inner corner of the border, merging with it.
export const BADGE_SIZE = 0.9
const BADGE_GLYPH = 0.66

export function SignFrame({
  width, height, unit,
}: { width: number; height: number; unit: number }) {
  const {
    plate, border,
  } = useSignColors()
  // The border is stroked on its centre line, 0.15h in, with a 0.25h radius,
  // which puts its edges on the 0.3h and 0.2h radii of figure 3.
  const inset = (FRAME.margin + FRAME.border / 2) * unit
  return <>
    <rect width={width} height={height} rx={FRAME.radius * unit} fill={plate} />
    <rect
      x={inset}
      y={inset}
      width={width - inset * 2}
      height={height - inset * 2}
      rx={FRAME.radius * unit - inset}
      fill="none"
      stroke={border}
      strokeWidth={FRAME.border * unit}
    />
  </>
}

export function CardinalBadge({
  text, font, unit,
}: { text: string; font: Font; unit: number }) {
  const {
    plate, border,
  } = useSignColors()
  if (!text) { return null }
  const inner = FRAME_INNER * unit
  // Start on the border's centre line so the badge overlaps the border and
  // the two read as one white shape, following the border's corner arc.
  const start = (FRAME.margin + FRAME.border / 2) * unit
  const corner = FRAME.radius * unit - start
  const end = inner + BADGE_SIZE * unit
  const glyph = BADGE_GLYPH * unit
  const glyphStart = inner + (BADGE_SIZE * unit - glyph) / 2
  return <g aria-label={`${text}方位`}>
    <path
      d={`M${start} ${start + corner}A${corner} ${corner} 0 0 1 ${start + corner} ${start}`
        + `H${end}V${end}H${start}z`}
      fill={border}
    />
    <OutlinedText
      font={font}
      text={text}
      startX={glyphStart}
      startY={glyphStart}
      width={glyph}
      height={glyph}
      fill={plate}
    />
  </g>
}
