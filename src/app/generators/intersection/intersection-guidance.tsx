import type {
  IntersectionDirection, IntersectionItem, Sign,
} from '@/lib/types'

import {
  balancedLines, CellText, cellTextWidth, measureStack, StackBlock, type StackRow,
} from './label-stack'
import {
  BADGE_SIZE, BLUE, CardinalBadge, FRAME_INNER, RED, SignFrame, WHITE,
} from './sign-frame'
import {
  useFont,
} from '../../fonts/FontContext'

import type {
  Font,
} from '@pdf-lib/fontkit'

// Viewbox units per h (character height). Every other size below is in h and
// comes from GB 5768.2-2022 figure 205 d) and its drawing E.167 d), where the
// board is 16h x 7h for three-character names.
const U = 100

const SHAFT_HALF = 0.18
const HEAD_HALF = 0.6
// Tip to the outer barb corner, and tip to the end of the barb's straight cut.
const HEAD_SHOULDER = 0.6
const HEAD_LENGTH = 1.1
// Centre road label: 0.7h characters in a hexagon 1.5h tall with 45° sides.
const HEX_HALF_HEIGHT = 0.75
const HEX_STROKE = 0.2
const HEX_PADDING = 0.2
const CENTER_CELL = 0.7
const CENTER_CELL_TWO_LINES = 0.4
const CENTER_LINE_GAP = 0.1
const CENTER_ONE_LINE_MAX = 6
// Straight arrow: tip 2.7h above the junction axis.
const STRAIGHT_REACH = 2.7
// Side arrows: tip 1.5h beyond the hexagon's outer vertex (3.6h for the drawing).
const SIDE_ARM = 1.5
// Approach stub below the hexagon.
const STUB_BELOW_AXIS = 1.3
// Clearances: board edge to outer text 0.7h, text to arrow tip 0.3h (sides) or
// 0.5h (straight), border to the straight text 0.5h, stub end to border 0.6h.
const OUTER_TEXT = 0.7
const SIDE_TEXT_GAP = 0.3
const STRAIGHT_TEXT_GAP = 0.5
const TOP_TEXT_GAP = 0.5
const STUB_TO_BORDER = 0.6
const BADGE_CLEARANCE = 0.3
const LINE_MAX = 6

type ContentRows = Record<IntersectionDirection, StackRow[]>

function stackRows(items: IntersectionItem[], roadSignList: Sign[]): StackRow[] {
  return items.flatMap<StackRow>((item) => {
    if (item.type === 'text') {
      return item.text.trim()
        ? balancedLines(item.text, LINE_MAX).map((text, index) => ({
          key: `${item.id}-${index}`, type: 'text' as const, text,
        }))
        : []
    }
    const sign = roadSignList.find(candidate => candidate.id === item.roadSignId)
    return sign ? [{
      key: item.id, type: 'shield' as const, sign,
    }] : []
  })
}

const BRANCH_ROTATION: Record<IntersectionDirection, number> = {
  straight: 0,
  left: -90,
  right: 90,
}

// Drawn pointing up from the junction centre, then rotated. `start` is where
// the shaft begins (hidden under the hexagon) and `reach` is the tip.
function Branch({
  direction, open, start, reach,
}: { direction: IntersectionDirection; open: boolean; start: number; reach: number }) {
  const s = SHAFT_HALF * U
  const tip = -reach * U
  const shoulder = tip + HEAD_SHOULDER * U
  const cut = tip + HEAD_LENGTH * U
  // The barb's inner edge runs at 45°, parallel to its outer edge, from the end
  // of the cut up to the shaft (0.68h below the tip, as in E.167 d).
  const notch = cut - (HEAD_HALF - SHAFT_HALF) * U
  const barHalf = SHAFT_HALF * U * 0.9
  // A closed branch keeps the shaft and ends in a red bar where the head would be.
  const barCenter = (tip + cut) / 2
  return <g transform={`rotate(${BRANCH_ROTATION[direction]})`}>
    {open
      ? <path
        d={`M${-s} ${-start * U}V${notch}L${-HEAD_HALF * U} ${cut}V${shoulder}L0 ${tip}`
          + `L${HEAD_HALF * U} ${shoulder}V${cut}L${s} ${notch}V${-start * U}z`}
        fill={WHITE}
      />
      : <>
        <rect x={-s} y={barCenter} width={s * 2} height={-start * U - barCenter} fill={WHITE} />
        <rect
          x={-HEAD_HALF * U} y={barCenter - barHalf} width={HEAD_HALF * U * 2}
          height={barHalf * 2} rx={U * 0.04} fill={RED}
        />
      </>}
  </g>
}

// Hexagon with 45° sides around the junction centre. `half` is half the
// length of its top edge; `inset` shrinks it for the blue interior.
function hexagonPath(half: number, inset: number) {
  const h = (HEX_HALF_HEIGHT - inset) * U
  const top = half * U
  return `M${-top} ${-h}H${top}L${top + h} 0L${top} ${h}H${-top}L${-top - h} 0z`
}

function centerLines(name: string) {
  const lines = balancedLines(name, CENTER_ONE_LINE_MAX)
  const cell = lines.length === 1 ? CENTER_CELL : CENTER_CELL_TWO_LINES
  return {
    lines, cell,
  }
}

function CenterLabel({
  name, font,
}: { name: string; font: Font }) {
  const {
    lines, cell,
  } = centerLines(name)
  const half = Math.max(...lines.map(line => cellTextWidth(line, cell))) / 2 + HEX_PADDING
  const total = lines.length * cell + (lines.length - 1) * CENTER_LINE_GAP
  return <g aria-label={name}>
    <path d={hexagonPath(half, 0)} fill={WHITE} />
    <path d={hexagonPath(half, HEX_STROKE)} fill={BLUE} />
    {lines.map((line, index) => <CellText
      key={`${index}-${line}`}
      text={line}
      x={-cellTextWidth(line, cell) * U / 2}
      y={(-total / 2 + index * (cell + CENTER_LINE_GAP)) * U}
      cell={cell * U}
      font={font}
    />)}
  </g>
}

// Half of the hexagon's top edge in h, or 0 when there is no centre name.
function hexagonTopHalf(name: string) {
  if (!name) { return 0 }
  const {
    lines, cell,
  } = centerLines(name)
  return Math.max(...lines.map(line => cellTextWidth(line, cell))) / 2 + HEX_PADDING
}
// The board is sized to its content, as in GB: width follows the longest side
// label and height follows the stacked rows, all from the h-based clearances.
export function IntersectionGuidanceSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const {
    directions, cardinalDirection,
  } = sign.intersectionConfig
  const centerName = sign.intersectionConfig.centerRoadName.trim()
  const rows: ContentRows = {
    left: stackRows(directions.left, roadSignList),
    straight: stackRows(directions.straight, roadSignList),
    right: stackRows(directions.right, roadSignList),
  }
  const stacks = {
    left: measureStack(rows.left, U, fontChinese),
    straight: measureStack(rows.straight, U, fontChinese),
    right: measureStack(rows.right, U, fontChinese),
  }
  // Stack sizes in h.
  const left = {
    w: stacks.left.width / U, h: stacks.left.height / U,
  }
  const right = {
    w: stacks.right.width / U, h: stacks.right.height / U,
  }
  const straight = {
    w: stacks.straight.width / U, h: stacks.straight.height / U,
  }

  const hexTop = hexagonTopHalf(centerName)
  const sideReach = centerName ? hexTop + HEX_HALF_HEIGHT + SIDE_ARM : 2.2
  const badgeBottom = FRAME_INNER + BADGE_SIZE + BADGE_CLEARANCE

  // Vertical layout, top to bottom.
  const tipFromText = straight.h
    ? FRAME_INNER + TOP_TEXT_GAP + straight.h + STRAIGHT_TEXT_GAP
    : FRAME_INNER + TOP_TEXT_GAP
  const sideHalf = Math.max(left.h, right.h) / 2
  const axis = Math.max(
    tipFromText + STRAIGHT_REACH,
    FRAME_INNER + TOP_TEXT_GAP + sideHalf,
    // The left labels must stay clear of the cardinal badge above them.
    cardinalDirection ? badgeBottom + left.h / 2 : 0,
  )
  const straightTop = axis - STRAIGHT_REACH - STRAIGHT_TEXT_GAP - straight.h
  const bottomInner = Math.max(
    axis + STUB_BELOW_AXIS + STUB_TO_BORDER,
    axis + sideHalf + TOP_TEXT_GAP,
  )
  const stubLength = bottomInner - STUB_TO_BORDER - axis
  const height = bottomInner + FRAME_INNER

  // Horizontal layout: symmetric about the junction so the straight label is centred.
  const sideNeed = sideReach + SIDE_TEXT_GAP + Math.max(left.w, right.w) + OUTER_TEXT
  const straightClearance = cardinalDirection && straightTop < badgeBottom
    ? badgeBottom
    : FRAME_INNER + TOP_TEXT_GAP
  const half = Math.max(sideNeed, straight.w / 2 + straightClearance)
  const width = half * 2
  const cx = half

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${width * U} ${height * U}`}
    role="img"
    aria-label={`${centerName || '未命名'}交叉路口指路标志`}
  >
    <SignFrame width={width * U} height={height * U} unit={U} />
    <g transform={`translate(${cx * U} ${axis * U})`}>
      <rect
        x={-SHAFT_HALF * U} y={0} width={SHAFT_HALF * 2 * U} height={stubLength * U}
        fill={WHITE}
      />
      <Branch direction="left" open={rows.left.length > 0} start={0} reach={sideReach} />
      <Branch direction="right" open={rows.right.length > 0} start={0} reach={sideReach} />
      <Branch
        direction="straight" open={rows.straight.length > 0} start={0} reach={STRAIGHT_REACH}
      />
      {centerName && <CenterLabel name={centerName} font={fontChinese} />}
    </g>
    <StackBlock
      stack={stacks.left}
      x={(cx - sideReach - SIDE_TEXT_GAP - left.w) * U}
      y={(axis - left.h / 2) * U}
      roadSignList={roadSignList} fontChinese={fontChinese} fontLatin={fontLatin}
    />
    <StackBlock
      stack={stacks.right}
      x={(cx + sideReach + SIDE_TEXT_GAP) * U}
      y={(axis - right.h / 2) * U}
      roadSignList={roadSignList} fontChinese={fontChinese} fontLatin={fontLatin}
    />
    <StackBlock
      stack={stacks.straight}
      x={(cx - straight.w / 2) * U}
      y={straightTop * U}
      roadSignList={roadSignList} fontChinese={fontChinese} fontLatin={fontLatin}
    />
    <CardinalBadge text={cardinalDirection} font={fontChinese} unit={U} />
  </svg>
}
