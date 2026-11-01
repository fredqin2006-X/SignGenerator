import {
  OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

// Shared visual spec for every sign in the 交叉路口 workspace. All values are
// in viewBox units; the three boards are 820–1000 units wide, so using the same
// absolute sizes keeps borders and badges visually identical side by side.
export const BLUE = '#2C64AD'
export const WHITE = '#FFFFFF'
export const RED = '#EE2525'

export const FRAME = {
  // Corner radius of the blue board.
  radius: 34,
  // Blue gap between the board edge and the outer edge of the white border.
  margin: 14,
  // White border stroke width.
  borderWidth: 9,
} as const

// Distance from the board edge to the inner edge of the white border.
export const FRAME_INNER = FRAME.margin + FRAME.borderWidth

const BADGE = {
  // Gap between the inner edge of the white border and the badge.
  gap: 13,
  size: 60,
  radius: 4,
  glyph: 42,
} as const

export function SignFrame({
  width, height,
}: { width: number; height: number }) {
  // The border is drawn on its centre line; using radius minus that inset
  // keeps the white border concentric with the board corners.
  const inset = FRAME.margin + FRAME.borderWidth / 2
  return <>
    <rect width={width} height={height} rx={FRAME.radius} fill={BLUE} />
    <rect
      x={inset}
      y={inset}
      width={width - inset * 2}
      height={height - inset * 2}
      rx={FRAME.radius - inset}
      fill="none"
      stroke={WHITE}
      strokeWidth={FRAME.borderWidth}
    />
  </>
}

export function CardinalBadge({
  text, font,
}: { text: string; font: Font }) {
  if (!text) { return null }
  const position = FRAME_INNER + BADGE.gap
  const glyphOffset = (BADGE.size - BADGE.glyph) / 2
  return <g aria-label={`${text}方位`}>
    <rect
      x={position}
      y={position}
      width={BADGE.size}
      height={BADGE.size}
      rx={BADGE.radius}
      fill={WHITE}
    />
    <OutlinedText
      font={font}
      text={text}
      startX={position + glyphOffset}
      startY={position + glyphOffset}
      width={BADGE.glyph}
      height={BADGE.glyph}
      fill={BLUE}
    />
  </g>
}
