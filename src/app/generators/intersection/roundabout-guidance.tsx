import type {
  RoundaboutConfig, RoundaboutDirection, RoundaboutRoadClass, Sign,
} from '@/lib/types'

import {
  balancedLines, measureStack, StackBlock, type MeasuredStack, type StackRow,
} from './label-stack'
import {
  BADGE_SIZE, CardinalBadge, FRAME_INNER, SignFrame,
} from './sign-frame'
import {
  useFont,
} from '../../fonts/FontContext'
import {
  useSignColors,
} from '../sign-colors'

// Viewbox units per h (character height). All geometry below is in h and comes
// from GB 5768.2-2022 drawing E.168 (路2): a 9h x 7.7h board, junction centre
// 4.5h from the left and 4.2h from the top, white ring of radius 0.8h around a
// 0.4h blue island, 0.4h wide arms with 0.4h fillets, tips 3h (left/right) and
// 2h (diagonals at 60°) from the centre, approach ending 0.7h above the bottom.
const U = 100

interface Layout {
  width: number
  height: number
  cx: number
  cy: number
  approachEnd: number
}

// 横向版面 is drawing E.168. 方形版面 is figure 206, whose board is a little
// taller (about 9h x 8.3h) with the same junction drawing.
const LAYOUTS: Record<RoundaboutConfig['layout'], Layout> = {
  wide: {
    width: 9, height: 7.7, cx: 4.5, cy: 4.2, approachEnd: 7.0,
  },
  square: {
    width: 9, height: 8.3, cx: 4.5, cy: 4.6, approachEnd: 7.6,
  },
}

const RING_OUTER = 0.8
const RING_INNER = 0.4
const FILLET = 0.4
// Hidden inner edge of each fillet shape, inside the white ring band.
const OVERLAP_RADIUS = 0.65
// Half widths. 编号集散道路 matches the 0.4h arms of E.168.
const ARM_HALF: Record<RoundaboutRoadClass, number> = {
  major: 0.25,
  numbered: 0.2,
  local: 0.15,
}
const EXIT_ANGLE: Record<RoundaboutDirection, number> = {
  right: 0,
  'right-forward': -60,
  straight: -90,
  'left-forward': -120,
  left: 180,
}
const EXIT_REACH: Record<RoundaboutDirection, number> = {
  right: 3,
  'right-forward': 2,
  straight: 1.75,
  'left-forward': 2,
  left: 3,
}

// Label clearances from E.168: labels sit 0.3h below the left/right arms,
// 0.3h above diagonal tips, centred 2.6h either side of the junction, and keep
// 0.3h (top/bottom) or 0.1h (sides) from the white border.
const CLEARANCE = 0.2
const MARGIN_TB = 0.3
const MARGIN_SIDE = 0.1
const BELOW_ARM = 0.3
const TIP_GAP = 0.3
const TIP_INSET = 0.2
const SIDE_LABEL_OFFSET = 2.6
const NAME_MAX = 4

type Point = [number, number]

const radians = (degrees: number) => degrees * Math.PI / 180
const toPath = (points: Point[]) =>
  `M${points.map(([x, y]) => `${(x * U).toFixed(2)} ${(y * U).toFixed(2)}`).join('L')}z`

// Clockwise on screen (positive shoelace area in y-down coordinates).
function clockwise(points: Point[]) {
  const area = points.reduce((total, [x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length]
    return total + x * ny - nx * y
  }, 0)
  return area < 0 ? [...points].reverse() : points
}

// Several shapes drawn as one path with the same winding. Drawn separately,
// shapes that share an edge are each anti-aliased there and the background
// shows through as a hairline; in one nonzero path the shared edges cancel.
const unionPath = (shapes: Point[][]) => shapes.map(shape => toPath(clockwise(shape))).join('')

const circlePoints = (radius: number, steps = 120): Point[] => Array.from({
  length: steps,
}, (_, index) => {
  const angle = index / steps * Math.PI * 2
  return [Math.cos(angle) * radius, Math.sin(angle) * radius]
})

// Points along the shorter arc from angle `from` to `to` around `center`.
function arc(center: Point, radius: number, from: number, to: number, steps = 10): Point[] {
  let delta = to - from
  while (delta > Math.PI) { delta -= Math.PI * 2 }
  while (delta < -Math.PI) { delta += Math.PI * 2 }
  return Array.from({
    length: steps + 1,
  }, (_, index) => {
    const angle = from + delta * index / steps
    return [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]
  })
}

// Arm from the junction centre (origin) outwards. Exits end in a 45° point;
// the approach ends square.
function armPolygon(angle: number, reach: number, half: number, pointed: boolean): Point[] {
  const d: Point = [Math.cos(angle), Math.sin(angle)]
  const n: Point = [-d[1], d[0]]
  const at = (along: number, across: number): Point =>
    [d[0] * along + n[0] * across, d[1] * along + n[1] * across]
  const shoulder = pointed ? reach - half : reach
  return [
    at(0, half), at(shoulder, half),
    ...pointed ? [at(reach, 0)] : [],
    at(shoulder, -half), at(0, -half),
  ]
}

// Concave fillet of radius FILLET between one edge of an arm and the ring.
function filletCenter(angle: number, half: number, side: 1 | -1): Point {
  const d: Point = [Math.cos(angle), Math.sin(angle)]
  const n: Point = [-d[1], d[0]]
  const offset = half + FILLET
  const along = Math.sqrt((RING_OUTER + FILLET) ** 2 - offset ** 2)
  return [d[0] * along + n[0] * offset * side, d[1] * along + n[1] * offset * side]
}

function filletPolygon(angle: number, half: number, side: 1 | -1): Point[] {
  const d: Point = [Math.cos(angle), Math.sin(angle)]
  const n: Point = [-d[1], d[0]]
  const center = filletCenter(angle, half, side)
  const along = Math.sqrt((RING_OUTER + FILLET) ** 2 - (half + FILLET) ** 2)
  // Tangent point on the arm edge, tangent point on the ring, and where the
  // arm edge meets the ring.
  const p1: Point = [d[0] * along + n[0] * half * side, d[1] * along + n[1] * half * side]
  const scale = RING_OUTER / (RING_OUTER + FILLET)
  const p2: Point = [center[0] * scale, center[1] * scale]
  const a1 = Math.atan2(p1[1] - center[1], p1[0] - center[0])
  const a2 = Math.atan2(p2[1] - center[1], p2[0] - center[0])
  // Only the fillet arc is a visible edge. The rest of the outline runs well
  // inside the arm (offset 0.4·half from its axis) and inside the ring
  // (radius OVERLAP_RADIUS), so the fillet overlaps both instead of meeting
  // them on a shared line, which would show as a hairline.
  const inner = half * 0.4 * side
  const pIn: Point = [d[0] * along + n[0] * inner, d[1] * along + n[1] * inner]
  const p2In: Point = [p2[0] * OVERLAP_RADIUS / RING_OUTER, p2[1] * OVERLAP_RADIUS / RING_OUTER]
  const meetIn = Math.sqrt(OVERLAP_RADIUS ** 2 - inner ** 2)
  const qIn: Point = [d[0] * meetIn + n[0] * inner, d[1] * meetIn + n[1] * inner]
  return [
    pIn, p1,
    ...arc(center, FILLET, a1, a2, 16),
    p2In,
    ...arc([0, 0], OVERLAP_RADIUS, Math.atan2(p2In[1], p2In[0]), Math.atan2(qIn[1], qIn[0]), 8),
  ]
}

// The blue slit through the ring left of the approach (E.168), which shows the
// direction of circulation. Points are relative to the junction centre.
function slitPolygon(approachHalf: number): Point[] {
  // The inner end reaches well into the blue island (radius 0.4h) so the two
  // blue shapes overlap instead of meeting on an edge.
  const base: Point[] = [[-0.17, 0.27], [-0.73, 0.75], [-0.42, 0.95], [-0.01, 0.31]]
  // Rotate clockwise for a wider approach so the slit stays clear of it.
  const extra = Math.max(0, approachHalf - ARM_HALF.numbered)
  const turn = Math.asin(Math.min(1, extra / RING_OUTER))
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)
  return base.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function pointRectDistance([px, py]: Point, rect: Rect) {
  const dx = Math.max(rect.x - px, 0, px - (rect.x + rect.w))
  const dy = Math.max(rect.y - py, 0, py - (rect.y + rect.h))
  return Math.hypot(dx, dy)
}

// Distance from a rectangle to a segment, sampled along the segment. Fine
// enough for label clearances of 0.2h.
function segmentRectDistance(a: Point, b: Point, rect: Rect) {
  const steps = 40
  let best = Infinity
  for (let index = 0; index <= steps; index++) {
    const t = index / steps
    const point: Point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    best = Math.min(best, pointRectDistance(point, rect))
  }
  return best
}

const rectsGap = (a: Rect, b: Rect) => Math.max(
  a.x - (b.x + b.w), b.x - (a.x + a.w), a.y - (b.y + b.h), b.y - (a.y + a.h),
)

interface Obstacles {
  circles: { center: Point; radius: number }[]
  segments: { a: Point; b: Point; half: number }[]
  rects: Rect[]
}

function junctionObstacles(
  layout: Layout,
  arms: { angle: number; reach: number; half: number }[],
  badge: boolean,
): Obstacles {
  const c: Point = [layout.cx, layout.cy]
  return {
    circles: [
      {
        center: c, radius: RING_OUTER,
      },
      ...arms.flatMap(arm => ([1, -1] as const).map((side) => {
        const [fx, fy] = filletCenter(radians(arm.angle), arm.half, side)
        // Region filled by the fillet, approximated by the circle through its
        // tangent points.
        return {
          center: [c[0] + fx * 0.75, c[1] + fy * 0.75] as Point,
          radius: FILLET * 0.6,
        }
      })),
    ],
    segments: arms.map(arm => ({
      a: c,
      b: [
        c[0] + Math.cos(radians(arm.angle)) * arm.reach,
        c[1] + Math.sin(radians(arm.angle)) * arm.reach,
      ] as Point,
      half: arm.half,
    })),
    rects: badge ? [{
      x: FRAME_INNER, y: FRAME_INNER, w: BADGE_SIZE, h: BADGE_SIZE,
    }] : [],
  }
}

function collides(rect: Rect, obstacles: Obstacles, placed: Rect[]) {
  return obstacles.circles.some(({
    center, radius,
  }) => pointRectDistance(center, rect) < radius + CLEARANCE)
    || obstacles.segments.some(({
      a, b, half,
    }) => segmentRectDistance(a, b, rect) < half + CLEARANCE)
    || [...obstacles.rects, ...placed].some(other => rectsGap(rect, other) < CLEARANCE)
}

interface Label {
  direction: RoundaboutDirection
  stack: MeasuredStack
  rect: Rect
}

const PLACEMENT_ORDER: RoundaboutDirection[] = [
  'straight', 'left-forward', 'right-forward', 'left', 'right',
]

// Diagonal exits are at 60° in E.168. With a straight exit as well they move to
// 45°, otherwise the straight and diagonal arms would be only 30° apart.
function exitAngle(direction: RoundaboutDirection, hasStraight: boolean) {
  if (!hasStraight) { return EXIT_ANGLE[direction] }
  if (direction === 'left-forward') { return -135 }
  if (direction === 'right-forward') { return -45 }
  return EXIT_ANGLE[direction]
}

// Starting position for each label (from E.168), and the direction it is
// pushed in when it touches the junction or another label.
function initialRect(
  direction: RoundaboutDirection, angle: number, w: number, h: number, layout: Layout,
) {
  const tip: Point = [
    layout.cx + Math.cos(radians(angle)) * EXIT_REACH[direction],
    layout.cy + Math.sin(radians(angle)) * EXIT_REACH[direction],
  ]
  const top = FRAME_INNER + MARGIN_TB
  switch (direction) {
    case 'left':
    case 'right': {
      const center = layout.cx + (direction === 'left' ? -1 : 1) * SIDE_LABEL_OFFSET
      return {
        rect: {
          x: center - w / 2, y: layout.cy + ARM_HALF.numbered + BELOW_ARM, w, h,
        },
        push: [direction === 'left' ? -1 : 1, 0] as Point,
      }
    }
    case 'straight':
      return {
        rect: {
          x: layout.cx - w / 2, y: Math.max(top, tip[1] - TIP_GAP - h), w, h,
        },
        push: [0, -1] as Point,
      }
    default: {
      const left = direction === 'left-forward'
      return {
        rect: {
          x: left ? tip[0] - TIP_INSET - w : tip[0] + TIP_INSET,
          y: Math.max(top, tip[1] - TIP_GAP - h),
          w,
          h,
        },
        push: [left ? -1 : 1, 0] as Point,
      }
    }
  }
}

function placeLabels(
  stacks: Partial<Record<RoundaboutDirection, MeasuredStack>>,
  layout: Layout,
  obstacles: Obstacles,
  hasStraight: boolean,
) {
  const bounds = {
    left: FRAME_INNER + MARGIN_SIDE,
    right: layout.width - FRAME_INNER - MARGIN_SIDE,
    top: FRAME_INNER + MARGIN_TB,
    bottom: layout.height - FRAME_INNER - MARGIN_TB,
  }
  const inside = (rect: Rect) => rect.x >= bounds.left - 1e-6 && rect.y >= bounds.top - 1e-6
    && rect.x + rect.w <= bounds.right + 1e-6 && rect.y + rect.h <= bounds.bottom + 1e-6
  const placed: Label[] = []
  for (const direction of PLACEMENT_ORDER) {
    const stack = stacks[direction]
    if (!stack) { continue }
    const w = stack.width / U
    const h = stack.height / U
    const start = initialRect(direction, exitAngle(direction, hasStraight), w, h, layout)
    const rect = {
      ...start.rect,
      // Keep a wide side label inside the board before pushing it outwards.
      x: Math.min(Math.max(start.rect.x, bounds.left), bounds.right - w),
    }
    const others = placed.map(label => label.rect)
    // Try the label's own push direction first; diagonal labels may also slide
    // down beside their arrow when the straight label takes the space above.
    const pushes: Point[] = start.push[1] === 0 && direction.endsWith('forward')
      ? [start.push, [start.push[0], 1], [start.push[0] * 0.5, 1]]
      : [start.push]
    const found = pushes.map((push) => {
      const candidate = {
        ...rect,
      }
      let steps = 0
      while ((collides(candidate, obstacles, others) || !inside(candidate)) && steps < 200) {
        candidate.x += push[0] * 0.02
        candidate.y += push[1] * 0.02
        steps++
      }
      return candidate
    }).find(candidate => inside(candidate) && !collides(candidate, obstacles, others))
    if (!found) { return null }
    placed.push({
      direction, stack, rect: found,
    })
  }
  return placed
}

function exitRows(
  exit: RoundaboutConfig['exits'][RoundaboutDirection],
  roadSignList: Sign[],
): StackRow[] {
  const sign = roadSignList.find(candidate => candidate.id === exit.roadSignId)
  return [
    ...sign ? [{
      key: `${exit.direction}-sign`, type: 'shield' as const, sign,
    }] : [],
    ...exit.destination.trim()
      ? balancedLines(exit.destination, NAME_MAX).map((text, index) => ({
        key: `${exit.direction}-${index}`, type: 'text' as const, text,
      }))
      : [],
  ]
}

export function RoundaboutGuidanceSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const colors = useSignColors()
  const config = sign.roundaboutConfig
  const directions = (Object.keys(config.exits) as RoundaboutDirection[])
    .filter(direction => config.exits[direction].enabled)
  const hasStraight = directions.includes('straight')
  const rows = Object.fromEntries(directions.map(direction => [
    direction, exitRows(config.exits[direction], roadSignList),
  ]).filter(([, list]) => list.length)) as Partial<Record<RoundaboutDirection, StackRow[]>>
  // GB sizes a guide sign from its lettering (§4.6.4): if the straight label
  // does not fit above the straight arrow, the board grows taller rather than
  // every label shrinking.
  const base = LAYOUTS[config.layout]
  const straightNeed = rows.straight
    ? FRAME_INNER + MARGIN_TB + measureStack(rows.straight, U, fontChinese).height / U
      + TIP_GAP + EXIT_REACH.straight
    : 0
  const grow = Math.max(0, straightNeed - base.cy)
  const layout: Layout = {
    ...base,
    height: base.height + grow,
    cy: base.cy + grow,
    approachEnd: base.approachEnd + grow,
  }
  const approachHalf = ARM_HALF[config.approachRoadClass]
  const arms = directions.map(direction => ({
    direction,
    angle: exitAngle(direction, hasStraight),
    reach: EXIT_REACH[direction],
    half: ARM_HALF[config.exits[direction].roadClass],
  }))
  const approach = {
    angle: 90, reach: layout.approachEnd - layout.cy, half: approachHalf,
  }
  const hasBadge = config.cardinalDirectionVisible && Boolean(config.cardinalDirection)
  const obstacles = junctionObstacles(layout, [...arms, approach], hasBadge)

  // All labels share one character size. Start at h and shrink in small steps
  // only when a long name or a tall shield does not fit.
  let labels: Label[] = []
  for (let scale = 1; scale >= 0.5; scale -= 0.04) {
    const stacks = Object.fromEntries(Object.entries(rows).map(([direction, list]) => [
      direction, measureStack(list, U * scale, fontChinese),
    ])) as Partial<Record<RoundaboutDirection, MeasuredStack>>
    const placed = placeLabels(stacks, layout, obstacles, hasStraight)
    if (placed) {
      labels = placed
      break
    }
  }

  const translate = `translate(${layout.cx * U} ${layout.cy * U})`
  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${layout.width * U} ${layout.height * U}`}
    role="img"
    aria-label="环岛图形式交叉路口预告标志"
  >
    <SignFrame width={layout.width * U} height={layout.height * U} unit={U} />
    <g transform={translate}>
      <path
        fill={colors.text}
        d={unionPath([
          armPolygon(radians(approach.angle), approach.reach, approach.half, false),
          ...arms.map(arm => armPolygon(radians(arm.angle), arm.reach, arm.half, true)),
          ...[...arms, approach].flatMap(arm => ([1, -1] as const)
            .map(side => filletPolygon(radians(arm.angle), arm.half, side))),
          circlePoints(RING_OUTER),
        ])}
      />
      <path
        fill={colors.plate}
        d={unionPath([circlePoints(RING_INNER), slitPolygon(approachHalf)])}
      />
    </g>
    {labels.map(label => <g
      key={label.direction}
      aria-label={`${config.exits[label.direction].destination || '未命名'} ${label.direction}`}
    >
      <StackBlock
        stack={label.stack}
        x={label.rect.x * U}
        y={label.rect.y * U}
        roadSignList={roadSignList}
        fontChinese={fontChinese}
        fontLatin={fontLatin}
      />
    </g>)}
    {config.cardinalDirectionVisible
      && <CardinalBadge text={config.cardinalDirection} font={fontChinese} unit={U} />}
  </svg>
}
