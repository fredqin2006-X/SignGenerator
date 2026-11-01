import type {
  Sign,
} from '@/lib/types'

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
  UrbanRoadNameSign, urbanRoadNameNaturalSize,
} from '../sign/urban-road-name'
import {
  useSignColors,
} from '../sign-colors'
import {
  OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

// GB guide-sign lettering sits in square character cells of side h with a
// 0.2h gap between cells (drawings E.167 / E.168).
export const CELL_GAP = 0.2
// Gap between stacked rows (a route shield over a place name, or two names).
export const ROW_GAP = 0.3
// The traffic-sign font's ink is slightly shorter than its cell; scale so the
// ink of this reference text fills about 97% of the cell, as in figure 205.
const INK_SHARE = 0.97
const REFERENCE_TEXT = '路'

export function cellTextWidth(text: string, cell: number) {
  const count = Array.from(text).length
  return count ? count * cell + (count - 1) * cell * CELL_GAP : 0
}

export function CellText({
  text, x, y, cell, font, fill,
}: { text: string; x: number; y: number; cell: number; font: Font; fill?: string }) {
  const {
    text: textColor,
  } = useSignColors()
  const chars = Array.from(text)
  const pitch = cell * (1 + CELL_GAP)
  const ink = cell * INK_SHARE
  return <g aria-label={text}>
    {chars.map((char, index) => <OutlinedText
      key={`${index}-${char}`}
      font={font}
      text={char}
      // Allow a wide glyph to use half of each neighbouring gap before it shrinks.
      startX={x + index * pitch - cell * CELL_GAP / 2}
      startY={y + (cell - ink) / 2}
      width={cell * (1 + CELL_GAP)}
      height={ink}
      fill={fill ?? textColor}
      options={{
        align: 'center',
        scaleMode: 'reference',
        referenceText: REFERENCE_TEXT,
      }}
    />)}
  </g>
}

// Splits a long name into two lines of nearly equal length.
export function balancedLines(text: string, maxPerLine: number) {
  const chars = Array.from(text.trim())
  if (chars.length <= maxPerLine) { return [chars.join('')] }
  const splitAt = Math.ceil(chars.length / 2)
  return [chars.slice(0, splitAt).join(''), chars.slice(splitAt).join('')]
}

// Shield heights in h. Ordinary-road shields are 1.2h tall in drawing E.168;
// national-expressway shields with their header band are about 2h in figure 205c.
function shieldHeight(sign: Sign) {
  switch (sign.template) {
    case 'ordinary-road':
      return 1.2
    case 'urban-road-name':
    case 'urban-expressway-road-name':
      return 1.3
    default:
      return 2
  }
}

function shieldAspect(sign: Sign, font: Font) {
  switch (sign.template) {
    case 'ordinary-road':
      return 213.51 / 102.59
    case 'urban-road-name': {
      // Width depends on the name and style since the city-road sign redesign.
      const size = urbanRoadNameNaturalSize(font, sign.urbanRoadName, sign.urbanRoadStyle)
      return size.width / size.height
    }
    case 'urban-expressway-road-name': {
      const size = urbanExpresswayRoadNameNaturalSize(font, sign.urbanRoadName)
      return size.width / size.height
    }
    default: {
      const size = expresswaySignNaturalSize(sign.code)
      return size.width / size.height
    }
  }
}

function Shield({
  sign, roadSignList, x, y, width, height, fontChinese, fontLatin,
}: {
  sign: Sign; roadSignList: Sign[]; x: number; y: number; width: number; height: number
  fontChinese: Font; fontLatin: Font
}) {
  if (sign.template === 'urban-road-name') {
    return <UrbanRoadNameSign
      name={sign.urbanRoadName}
      style={sign.urbanRoadStyle}
      routeSign={roadSignList.find(candidate => candidate.id === sign.urbanRoadRouteSignId)}
      leftDirection={sign.urbanLeftDirection}
      rightDirection={sign.urbanRightDirection}
      x={x} y={y} width={width} height={height}
    />
  }
  const isUrbanExpressway = sign.template === 'urban-expressway-road-name'
  return <RouteSignNode
    code={isUrbanExpressway ? sign.urbanRoadName : sign.code}
    kind={isUrbanExpressway ? 'urban-expressway' : sign.kind}
    provinceLabel={sign.provinceLabel}
    threeDigitDescend={sign.threeDigitDescend}
    fontChinese={fontChinese}
    fontLatin={fontLatin}
    x={x} y={y} width={width} height={height}
  />
}

export type StackRow =
  | { key: string; type: 'text'; text: string }
  | { key: string; type: 'shield'; sign: Sign }

interface MeasuredRow {
  row: StackRow
  width: number
  height: number
}

export interface MeasuredStack {
  rows: MeasuredRow[]
  width: number
  height: number
  // Viewbox units per h used for this stack.
  cell: number
}

// Rows are measured in viewbox units for a given character cell size.
export function measureStack(rows: StackRow[], cell: number, font: Font): MeasuredStack {
  const measured = rows.map((row) => {
    if (row.type === 'text') {
      return {
        row, width: cellTextWidth(row.text, cell), height: cell,
      }
    }
    const height = shieldHeight(row.sign) * cell
    return {
      row, width: height * shieldAspect(row.sign, font), height,
    }
  })
  return {
    rows: measured,
    width: Math.max(0, ...measured.map(item => item.width)),
    height: measured.reduce((total, item) => total + item.height, 0)
      + Math.max(0, measured.length - 1) * ROW_GAP * cell,
    cell,
  }
}

// Draws a measured stack with its top-left corner at (x, y); rows are centred.
export function StackBlock({
  stack, x, y, roadSignList, fontChinese, fontLatin,
}: {
  stack: MeasuredStack; x: number; y: number; roadSignList: Sign[]
  fontChinese: Font; fontLatin: Font
}) {
  const tops = stack.rows.reduce<number[]>((list, item, index) => [
    ...list,
    index === 0 ? y : list[index - 1] + stack.rows[index - 1].height + ROW_GAP * stack.cell,
  ], [])
  return <g>
    {stack.rows.map(({
      row, width, height,
    }, index) => {
      const left = x + (stack.width - width) / 2
      return row.type === 'text'
        ? <CellText
          key={row.key} text={row.text} x={left} y={tops[index]}
          cell={stack.cell} font={fontChinese}
        />
        : <Shield
          key={row.key} sign={row.sign} roadSignList={roadSignList}
          x={left} y={tops[index]} width={width} height={height}
          fontChinese={fontChinese} fontLatin={fontLatin}
        />
    })}
  </g>
}
