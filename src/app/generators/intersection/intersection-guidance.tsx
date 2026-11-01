import type {
  IntersectionDirection, IntersectionItem, Sign,
} from '@/lib/types'

import {
  BLUE, CardinalBadge, RED, SignFrame, WHITE,
} from './sign-frame'
import {
  fittedTextHeight,
} from './text-fit'
import {
  useFont,
} from '../../fonts/FontContext'
import {
  expresswaySignNaturalSize,
} from '../sign/expressway'
import {
  RouteSignNode,
} from '../sign/route-sign'
import {
  urbanExpresswayRoadNameNaturalSize,
} from '../sign/urban-expressway-road-name'
import {
  OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const WIDTH = 1000
const HEIGHT = 620

// Junction centre and arrow geometry, shared by all three branches so the
// straight, left and right arrows are exactly the same size.
const CX = 500
const CY = 400
const SHAFT_HALF = 18
const HEAD_HALF = 52
const HEAD_LENGTH = 62
// Distance from the junction centre to each arrow tip; equal in all directions.
const REACH = 232
// Shafts start inside the centre label, which is drawn on top of them.
const SHAFT_START = 35
// Bottom end of the approach road (below the junction, no arrow head).
const APPROACH_END = 545

const DIRECTION_TEXT = {
  maxHeight: 56,
  // Fixed letter spacing as a share of character height.
  gapRatio: 0.15,
  referenceText: '北京路',
} as const

interface DirectionArea {
  x: number
  y: number
  width: number
  height: number
}

type ContentRow =
  | { key: string; type: 'text'; text: string }
  | { key: string; type: 'road-sign'; sign: Sign }

// Side areas run from 14 units inside the white border to 14 units before the
// arrow tips (x = CX ∓ REACH), so both sides have the same width. The straight
// area ends 16 units above the straight arrow tip.
const DIRECTION_AREAS: Record<IntersectionDirection, DirectionArea> = {
  left: {
    x: 37, y: 290, width: 217, height: 220,
  },
  straight: {
    x: 350, y: 40, width: 300, height: 112,
  },
  right: {
    x: 746, y: 290, width: 217, height: 220,
  },
}

function activeItems(items: IntersectionItem[], roadSignList: Sign[]) {
  return items.filter(item => item.type === 'text'
    ? Boolean(item.text.trim())
    : roadSignList.some(sign => sign.id === item.roadSignId))
}

function splitLongLine(text: string) {
  const characters = Array.from(text.trim())
  if (characters.length <= 10) { return [text.trim()] }
  const splitAt = Math.ceil(characters.length / 2)
  return [characters.slice(0, splitAt).join(''), characters.slice(splitAt).join('')]
}

function routeWidth(sign: Sign, height: number, fontChinese: Font) {
  if (sign.template === 'ordinary-road') { return height * 213.51 / 102.59 }
  if (sign.template === 'urban-expressway-road-name') {
    const size = urbanExpresswayRoadNameNaturalSize(fontChinese, sign.urbanRoadName)
    return height * size.width / size.height
  }
  const size = expresswaySignNaturalSize(sign.code)
  return height * size.width / size.height
}

function contentRows(items: IntersectionItem[], roadSignList: Sign[]): ContentRow[] {
  return items.flatMap<ContentRow>((item) => {
    if (item.type === 'text') {
      return splitLongLine(item.text).map((text, index) => ({
        key: `${item.id}-text-${index}`,
        type: 'text' as const,
        text,
      }))
    }
    const sign = roadSignList.find(candidate => candidate.id === item.roadSignId)
    return sign ? [{
      key: `${item.id}-sign`, type: 'road-sign' as const, sign,
    }] : []
  })
}

function rowHeightFor(area: DirectionArea, rowCount: number) {
  return Math.min(92, area.height / Math.max(1, rowCount))
}

// One character height for every direction label on the board, so a long name
// in one direction does not leave the other directions at a different size.
function sharedTextHeight(
  rowsByDirection: Record<IntersectionDirection, ContentRow[]>,
  font: Font,
) {
  const directions = Object.keys(rowsByDirection) as IntersectionDirection[]
  const rowLimit = Math.min(...directions.map(direction => rowHeightFor(
    DIRECTION_AREAS[direction],
    rowsByDirection[direction].length,
  ) * 0.72))
  return fittedTextHeight(
    font,
    directions.flatMap(direction => rowsByDirection[direction]
      .flatMap(row => row.type === 'text' ? [{
        text: row.text, width: DIRECTION_AREAS[direction].width,
      }] : [])),
    Math.min(DIRECTION_TEXT.maxHeight, rowLimit),
    DIRECTION_TEXT.gapRatio,
    DIRECTION_TEXT.referenceText,
  )
}

function DirectionContents({
  rows,
  area,
  textHeight,
  fontChinese,
  fontLatin,
}: {
  rows: ContentRow[]
  area: DirectionArea
  textHeight: number
  fontChinese: Font
  fontLatin: Font
}) {
  const rowHeight = rowHeightFor(area, rows.length)
  const totalHeight = rows.length * rowHeight
  const startY = area.y + (area.height - totalHeight) / 2
  const gap = textHeight * DIRECTION_TEXT.gapRatio

  return <>
    {rows.map((row, index) => {
      const y = startY + index * rowHeight
      if (row.type === 'text') {
        return <OutlinedText
          key={row.key}
          font={fontChinese}
          text={row.text}
          startX={area.x}
          startY={y + (rowHeight - textHeight) / 2}
          width={area.width}
          height={textHeight}
          fill={WHITE}
          options={{
            align: 'center',
            minGap: gap,
            maxGap: gap,
            scaleMode: 'reference',
            referenceText: DIRECTION_TEXT.referenceText,
          }}
        />
      }
      const height = Math.max(18, rowHeight * 0.9)
      const naturalWidth = routeWidth(row.sign, height, fontChinese)
      const width = Math.min(area.width, naturalWidth)
      const isUrbanExpressway = row.sign.template === 'urban-expressway-road-name'
      return <RouteSignNode
        key={row.key}
        code={isUrbanExpressway ? row.sign.urbanRoadName : row.sign.code}
        kind={isUrbanExpressway ? 'urban-expressway' : row.sign.kind}
        provinceLabel={row.sign.provinceLabel}
        threeDigitDescend={row.sign.threeDigitDescend}
        fontChinese={fontChinese}
        fontLatin={fontLatin}
        x={area.x + (area.width - width) / 2}
        y={y + (rowHeight - height) / 2}
        width={width}
        height={height}
      />
    })}
  </>
}

function CenterRoadLabel({
  text, font,
}: { text: string; font: Font }) {
  const lines = splitLongLine(text)
  const lineHeight = lines.length === 1 ? 62 : 38
  const gap = lines.length === 1 ? 0 : 8
  const totalHeight = lines.length * lineHeight + (lines.length - 1) * gap
  const startY = 400 - totalHeight / 2

  return <g>
    <path
      d="M350 400l30-45h240l30 45-30 45H380z"
      fill={BLUE}
      stroke={WHITE}
      strokeWidth="8"
      strokeLinejoin="round"
    />
    {lines.map((line, index) => <OutlinedText
      key={`${line}-${index}`}
      font={font}
      text={line}
      startX={405}
      startY={startY + index * (lineHeight + gap)}
      width={190}
      height={lineHeight}
      fill={WHITE}
      options={{
        minGap: 3,
        maxGap: 12,
        scaleMode: 'reference',
        referenceText: '南京路',
      }}
    />)}
  </g>
}

const BRANCH_ROTATION: Record<IntersectionDirection, number> = {
  straight: 0,
  left: -90,
  right: 90,
}

// Every branch is the same upward-pointing shape, rotated about the junction
// centre. Closed branches keep the shaft and end in a red bar instead of a head.
function Branch({
  direction, open,
}: { direction: IntersectionDirection; open: boolean }) {
  const headBase = REACH - HEAD_LENGTH
  // The red bar of a closed branch sits where the middle of the arrow head would be.
  const barCenter = REACH - HEAD_LENGTH / 2
  const barHalfHeight = SHAFT_HALF - 1
  return <g transform={`translate(${CX} ${CY}) rotate(${BRANCH_ROTATION[direction]})`}>
    {open
      ? <path
        d={`M${-SHAFT_HALF} ${-SHAFT_START}V${-headBase}H${-HEAD_HALF}L0 ${-REACH}`
          + `L${HEAD_HALF} ${-headBase}H${SHAFT_HALF}V${-SHAFT_START}z`}
        fill={WHITE}
      />
      : <>
        <rect
          x={-SHAFT_HALF} y={-barCenter} width={SHAFT_HALF * 2} height={barCenter - SHAFT_START}
          fill={WHITE}
        />
        <rect
          x={-HEAD_HALF} y={-barCenter - barHalfHeight} width={HEAD_HALF * 2}
          height={barHalfHeight * 2} rx="4" fill={RED}
        />
      </>}
  </g>
}

export function IntersectionGuidanceSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const directions = sign.intersectionConfig.directions
  const active = {
    left: activeItems(directions.left, roadSignList),
    straight: activeItems(directions.straight, roadSignList),
    right: activeItems(directions.right, roadSignList),
  }
  const centerRoadName = sign.intersectionConfig.centerRoadName.trim()
  const rows = {
    left: contentRows(active.left, roadSignList),
    straight: contentRows(active.straight, roadSignList),
    right: contentRows(active.right, roadSignList),
  }
  const textHeight = sharedTextHeight(rows, fontChinese)

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    role="img"
    aria-label={`${centerRoadName || '未命名'}交叉路口指路标志`}
  >
    <SignFrame width={WIDTH} height={HEIGHT} />
    <rect
      x={CX - SHAFT_HALF} y={CY + SHAFT_START}
      width={SHAFT_HALF * 2} height={APPROACH_END - CY - SHAFT_START}
      fill={WHITE}
    />
    <Branch direction="left" open={active.left.length > 0} />
    <Branch direction="straight" open={active.straight.length > 0} />
    <Branch direction="right" open={active.right.length > 0} />
    {(Object.keys(rows) as IntersectionDirection[]).map(direction => <DirectionContents
      key={direction}
      rows={rows[direction]}
      area={DIRECTION_AREAS[direction]}
      textHeight={textHeight}
      fontChinese={fontChinese}
      fontLatin={fontLatin}
    />)}
    <CenterRoadLabel text={centerRoadName} font={fontChinese} />
    <CardinalBadge text={sign.intersectionConfig.cardinalDirection} font={fontChinese} />
  </svg>
}
