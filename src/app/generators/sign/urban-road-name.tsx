import {
  directionLetter,
} from '@/lib/sign-options'
import type {
  ExpresswayKind, OrdinaryRoadKind, Sign, UrbanRoadStyle,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  SignColorsProvider,
  useSignColors,
  useTemplateColors,
} from '../sign-colors'
import {
  OutlinedText, textLayout,
} from '../svg-text'
import {
  ExpresswaySignNode, expresswaySignNaturalSize,
} from './expressway'
import {
  OrdinaryRoadSignSvg,
} from './ordinary_road'

// 「直行＋箭头」样式用的直行箭头：带后掠翼的箭头（箭头头部 + 短箭杆），
// 路径自带 transform，另外记录了它渲染后的实测包围盒和中央箭杆范围，用来摆放和缩放。
const FRONT_ARROW_PATH = 'M334.3201,229.2207c0.1724,-0.00014 0.2829,0.02593 0.3315,0.0782c9.89893,10.65074 16.8984,18.17944 20.9984,22.5861c0.52075,0.55956 0.81017,1.29562 0.81,2.06v17.43c-0.00098,0.14203 -0.08889,0.26894 -0.22151,0.31977c-0.13261,0.05084 -0.28283,0.01521 -0.37849,-0.08977l-13.48,-14.64c-0.14016,-0.15138 -0.3587,-0.20154 -0.55085,-0.12645c-0.19216,0.07509 -0.31877,0.26014 -0.31915,0.46645l-0.01,14.7c0,0.30169 -0.21911,0.56166 -0.5219,0.6192c-0.23093,0.042 -2.43134,0.06403 -6.6012,0.0661c-4.1698,0.00206 -6.3702,-0.01777 -6.6012,-0.0595c-0.30284,-0.05725 -0.52221,-0.317 -0.5225,-0.6187l-0.0338,-14.7c-0.00062,-0.20628 -0.12742,-0.39117 -0.31962,-0.46606c-0.19221,-0.07489 -0.41066,-0.02453 -0.55068,0.12696l-13.4654,14.6534c-0.09555,0.10513 -0.24577,0.14094 -0.37847,0.09023c-0.1327,-0.05071 -0.22075,-0.17758 -0.22183,-0.31963l-0.0173,-17.43c-0.00092,-0.76438 0.2878,-1.50074 0.808,-2.0608c4.0956,-4.41074 11.08756,-11.94637 20.9759,-22.6069c0.04853,-0.05234 0.13856,-0.07854 0.2701,-0.0786z'
const FRONT_ARROW_PATH_TRANSFORM = 'translate(334.85 255.55) scale(0.72) translate(-334.85 -255.55)'
// 下面两组数都是「路径自身 transform 之后」的坐标（由渲染结果量出来）。
// 箭杆底部与箭头外角齐平（改自用户原路径：把箭杆两侧的 23.88 缩到 14.7），所以整体接近正方形。
const FRONT_ARROW_BOX = {
  left: 318.55,
  top: 236.55,
  width: 31.8,
  height: 31.35,
}
const FRONT_ARROW_SHAFT = {
  left: 330.5,
  right: 340,
  top: 254.94,
  bottom: 267.5,
}

const WIDTH = 760
const HEIGHT = 300
const MIN_WIDTH = 760
const MAX_WIDTH = 1600
const PLATE_PADDING = 16
const PLATE_RADIUS = 48
const INNER_RADIUS = 35
const BORDER_STROKE = 10

// 「直行＋箭头」样式：左侧一个直行箭头，方向字和英文首字母挖在箭杆里（填牌面底色）。
// 参照实拍牌：箭头高度约占牌面四成，方向字大致填满箭杆宽度、首字母在下方。
const ARROW_HEIGHT = 125
const ARROW_LEFT = 56
const ARROW_SCALE = ARROW_HEIGHT / FRONT_ARROW_BOX.height
const ARROW_TOP = (HEIGHT - ARROW_HEIGHT) / 2
const ARROW_WIDTH = FRONT_ARROW_BOX.width * ARROW_SCALE
const ARROW_TRANSFORM = [
  `translate(${ARROW_LEFT - FRONT_ARROW_BOX.left * ARROW_SCALE} ${ARROW_TOP - FRONT_ARROW_BOX.top * ARROW_SCALE})`,
  `scale(${ARROW_SCALE})`,
].join(' ')
// 箭杆在牌面上的实际位置：方向字和首字母都落在这条窄框里，所以尺寸由箭杆宽度反推。
const arrowX = (value: number) => ARROW_LEFT + (value - FRONT_ARROW_BOX.left) * ARROW_SCALE
const arrowY = (value: number) => ARROW_TOP + (value - FRONT_ARROW_BOX.top) * ARROW_SCALE
const ARROW_SHAFT_LEFT_X = arrowX(FRONT_ARROW_SHAFT.left)
const ARROW_SHAFT_RIGHT_X = arrowX(FRONT_ARROW_SHAFT.right)
const ARROW_SHAFT_TOP_Y = arrowY(FRONT_ARROW_SHAFT.top)
const ARROW_SHAFT_BOTTOM_Y = arrowY(FRONT_ARROW_SHAFT.bottom)
const ARROW_SHAFT_WIDTH = ARROW_SHAFT_RIGHT_X - ARROW_SHAFT_LEFT_X
const ARROW_NAME_SIDE_LEFT = ARROW_LEFT + ARROW_WIDTH + 45
const ARROW_DIRECTION_BOX = {
  charHeight: 37,
  letterHeight: 20,
  // 方向字底边到「箭杆收窄处」的空隙，避免压到两侧缺口的斜边
  charBottomGap: 6,
}
// 方向字放在箭头头部（箭杆收窄之前），首字母居中放在箭杆里。
const ARROW_DIRECTION_TEXT_BOX = {
  startY: ARROW_SHAFT_TOP_Y - ARROW_DIRECTION_BOX.charBottomGap - ARROW_DIRECTION_BOX.charHeight,
  width: ARROW_SHAFT_WIDTH,
  height: ARROW_DIRECTION_BOX.charHeight,
}
const ARROW_DIRECTION_LETTER_BOX = {
  startY: (ARROW_SHAFT_TOP_Y + ARROW_SHAFT_BOTTOM_Y - ARROW_DIRECTION_BOX.letterHeight) / 2,
  width: ARROW_SHAFT_WIDTH,
  height: ARROW_DIRECTION_BOX.letterHeight,
}

// 「双向＋六边形」样式：六边形描边框、框内路名、两侧「北 N / 南 S」。
// 数值参照实际标志照片按牌面比例换算；左右顶点距牌面边缘固定，中间直边随路名长度伸缩。
const HEXAGON_TOP = 52
const HEXAGON_BOTTOM = 248
const HEXAGON_SIDE = 124
const HEXAGON_SHOULDER = 66
const HEXAGON_STROKE = 12
// 「单向＋六边形」样式：左侧一个方向字，六边形只在左边收成尖角，右边与牌面边缘齐平。
// 同样按照片换算，尖角到牌面左缘的距离与双向样式一致，保证两种样式并排时对齐。
const ONE_WAY_LEFT_VERTEX = 165
const ONE_WAY_RIGHT_INSET = 34
// 这类标志的白线是「中间宽、两边窄」：两层描边共用上下直边和肩角，
// 只把中间点（左右顶点）往内挪一点，于是白线在尖角处并成一条更宽的线、两侧斜边保持原宽度。
// 14 是刚好能并上的量（超过 strokeWidth / sin(斜边角度) ≈ 14.5 就会在尖角露出蓝缝）。
const HEXAGON_POINT_OFFSET = 14
const DIRECTION_LABEL_SIDE = 80
const DIRECTION_TEXT_BOX = {
  startY: 72,
  width: 70,
  height: 66,
}
const DIRECTION_LETTER_BOX = {
  startY: 156,
  width: 40,
  height: 26,
}

interface NameLayout {
  // 路名字高（折行时用 wrappedHeight）
  height: number
  wrappedHeight: number
  lineGap: number
  minGap: number
  maxGap: number
  referenceText: string
  // 路名框到牌面左右边缘的距离，用来反推牌面宽度
  sideLeft: number
  sideRight: number
  wrap: boolean
}

const TEXT_NAME_LAYOUT = {
  height: 128,
  wrappedHeight: 82,
  lineGap: 20,
  minGap: 8,
  maxGap: 26,
  referenceText: '南京路',
  wrap: true,
} satisfies Omit<NameLayout, 'sideLeft' | 'sideRight'>

const HEXAGON_NAME_LAYOUT = {
  height: 80,
  wrappedHeight: 170,
  lineGap: 0,
  minGap: 20,
  maxGap: 62,
  referenceText: '鲤鱼山南路',
  wrap: false,
} satisfies Omit<NameLayout, 'sideLeft' | 'sideRight'>

const NAME_LAYOUT = {
  plain: {
    ...TEXT_NAME_LAYOUT,
    sideLeft: 64,
    sideRight: 64,
  },
  'right-chevron': {
    ...TEXT_NAME_LAYOUT,
    sideLeft: 50,
    sideRight: 170,
  },
  bidirectional: {
    ...TEXT_NAME_LAYOUT,
    sideLeft: 112,
    sideRight: 112,
  },
  'straight-text': {
    ...TEXT_NAME_LAYOUT,
    sideLeft: 190,
    sideRight: 60,
  },
  'straight-direction': {
    ...TEXT_NAME_LAYOUT,
    sideLeft: ARROW_NAME_SIDE_LEFT,
    sideRight: 60,
  },
  'bidirectional-hexagon': {
    ...HEXAGON_NAME_LAYOUT,
    sideLeft: HEXAGON_SIDE + 88,
    sideRight: HEXAGON_SIDE + 88,
  },
  'unidirectional-hexagon': {
    ...HEXAGON_NAME_LAYOUT,
    sideLeft: ONE_WAY_LEFT_VERTEX + HEXAGON_SHOULDER + 24,
    sideRight: ONE_WAY_RIGHT_INSET + 26,
  },
} satisfies Record<Exclude<UrbanRoadStyle, 'straight-route'>, NameLayout>

function cleanRoadName(name: string) {
  return Array.from(String(name || '').trim()).slice(0, 24).join('') || '南京路'
}

function wrapRoadName(text: string, maxLines = 2) {
  const characters = Array.from(text)
  if (characters.length <= 8 || maxLines === 1) { return [text] }
  const splitAt = Math.ceil(characters.length / 2)
  return [
    characters.slice(0, splitAt).join(''),
    characters.slice(splitAt).join(''),
  ]
}

/** 单行路名排版后的宽度：字形宽度 + 字间距。 */
function lineWidth(
  font: Parameters<typeof textLayout>[0],
  line: string,
  height: number,
  layout: NameLayout,
) {
  const result = textLayout(font, line, height, {
    scaleMode: 'reference',
    referenceText: layout.referenceText,
  })
  return result.usedWidth + Math.max(0, result.glyphs.length - 1) * layout.maxGap
}

/**
 * 按路名长度推算牌面宽度：刚好放下「路名 + 两侧图形」，并限制在
 * [MIN_WIDTH, MAX_WIDTH] 之间（过长的路名靠文字缩放适配，而不是把牌子拉到不成比例）。
 */
export function urbanRoadNameNaturalSize(
  font: Parameters<typeof textLayout>[0],
  name: string,
  style: UrbanRoadStyle = 'bidirectional',
) {
  const text = cleanRoadName(name)
  if (style === 'straight-route') {
    return {
      text,
      width: WIDTH,
      height: HEIGHT,
    }
  }

  const layout = NAME_LAYOUT[style]
  const lines = layout.wrap ? wrapRoadName(text) : [text]
  const lineHeight = lines.length > 1 ? layout.wrappedHeight : layout.height
  const contentWidth = Math.max(
    ...lines.map(line => lineWidth(font, line, lineHeight, layout)),
  )
  const width = Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, Math.ceil(contentWidth + layout.sideLeft + layout.sideRight)),
  )
  return {
    text,
    width,
    height: HEIGHT,
  }
}

function StraightArrow() {
  const colors = useSignColors()
  return <path
    d="M72 238V108H35L104 35l69 73h-37v130z"
    fill={colors.text}
  />
}

/** 直行箭头：路径自带局部坐标和 transform，这里只用 transform 把它摆到牌面上。 */
function StraightDir({
  transform,
}: { transform: string }) {
  const colors = useSignColors()
  return <g transform={transform}>
    <path
      d={FRONT_ARROW_PATH}
      fill={colors.text}
      transform={FRONT_ARROW_PATH_TRANSFORM}
    />
  </g>
}

function HexagonOutline({
  d,
}: { d: string }) {
  const colors = useSignColors()
  return <path
    d={d}
    fill="none"
    stroke={colors.border}
    strokeWidth={HEXAGON_STROKE}
    strokeLinejoin="miter"
  />
}

/**
 * 双向六边形。pointOffset 只作用在左右两个中间点上，肩角和上下直边都用未偏移的顶点算，
 * 所以第二层描边只把中间点往内挪 —— 白线在尖角处变宽、两侧斜边仍是原宽度。
 */
function twoWayHexagonPath(width: number, pointOffset = 0) {
  const leftVertex = HEXAGON_SIDE
  const rightVertex = width - HEXAGON_SIDE
  return [
    `M${leftVertex + pointOffset} ${HEIGHT / 2}`,
    `L${leftVertex + HEXAGON_SHOULDER} ${HEXAGON_TOP}`,
    `H${rightVertex - HEXAGON_SHOULDER}`,
    `L${rightVertex - pointOffset} ${HEIGHT / 2}`,
    `L${rightVertex - HEXAGON_SHOULDER} ${HEXAGON_BOTTOM}`,
    `H${leftVertex + HEXAGON_SHOULDER}`,
    'Z',
  ].join('')
}

/** 单向六边形：只有左侧尖角，右侧是贴着牌面边缘的直边。pointOffset 同样只挪那个尖角。 */
function oneWayHexagonPath(width: number, pointOffset = 0) {
  const leftVertex = ONE_WAY_LEFT_VERTEX
  const rightEdge = width - ONE_WAY_RIGHT_INSET
  return [
    `M${leftVertex + pointOffset} ${HEIGHT / 2}`,
    `L${leftVertex + HEXAGON_SHOULDER} ${HEXAGON_TOP}`,
    `H${rightEdge}`,
    `V${HEXAGON_BOTTOM}`,
    `H${leftVertex + HEXAGON_SHOULDER}`,
    'Z',
  ].join('')
}

function DirectionHexagon({
  width,
}: { width: number }) {
  return <HexagonOutline d={twoWayHexagonPath(width)} />
}

/** 只挪中间点的那一层，和主描边一起构成「中间宽两边窄」的白线。 */
function Dbold({
  width,
}: { width: number }) {
  return <HexagonOutline d={twoWayHexagonPath(width, HEXAGON_POINT_OFFSET)} />
}

function OneWayHexagon({
  width,
}: { width: number }) {
  return <HexagonOutline d={oneWayHexagonPath(width)} />
}

function OneWayDbold({
  width,
}: { width: number }) {
  return <HexagonOutline d={oneWayHexagonPath(width, HEXAGON_POINT_OFFSET)} />
}

function DirectionLabel({
  centerX,
  direction,
  letter,
  textBox = DIRECTION_TEXT_BOX,
  letterBox = DIRECTION_LETTER_BOX,
  fill,
}: {
  centerX: number
  direction: string
  letter: string
  textBox?: { startY: number; width: number; height: number }
  letterBox?: { startY: number; width: number; height: number }
  fill?: string
}) {
  const colors = useSignColors()
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const resolvedFill = fill ?? colors.text
  return <>
    <OutlinedText
      font={fontChinese}
      text={direction}
      startX={centerX - textBox.width / 2}
      startY={textBox.startY}
      width={textBox.width}
      height={textBox.height}
      fill={resolvedFill}
      options={{
        scaleMode: 'reference',
        referenceText: '北',
      }}
    />
    <OutlinedText
      font={fontLatin}
      text={letter}
      startX={centerX - letterBox.width / 2}
      startY={letterBox.startY}
      width={letterBox.width}
      height={letterBox.height}
      fill={resolvedFill}
      options={{
        scaleMode: 'reference',
        referenceText: 'N',
      }}
    />
  </>
}

function RoadNameText({
  text,
  startX,
  width,
  layout,
}: {
  text: string
  startX: number
  width: number
  layout: NameLayout
}) {
  const colors = useTemplateColors('urban-road-name')
  const font = useFont('a')
  const lines = layout.wrap ? wrapRoadName(text) : [text]
  const lineHeight = lines.length > 1 ? layout.wrappedHeight : layout.height
  const rowGap = lines.length > 1 ? layout.lineGap : 0
  const totalHeight = lineHeight * lines.length + rowGap * (lines.length - 1)
  const startY = (HEIGHT - totalHeight) / 2
  return <>
    {lines.map((line, index) => <OutlinedText
      key={`${line}-${index}`}
      font={font}
      text={line}
      startX={startX}
      startY={startY + index * (lineHeight + rowGap)}
      width={width}
      height={lineHeight}
      fill={colors.text}
      options={{
        minGap: layout.minGap,
        maxGap: layout.maxGap,
        scaleMode: 'reference',
        referenceText: layout.referenceText,
      }}
    />)}
  </>
}

function RightChevronPlate({
  width,
  text,
  layout,
}: {
  width: number
  text: string
  layout: NameLayout
}) {
  const colors = useSignColors()
  // 缺口和白色箭头固定在右端，牌面变宽时整体右移。
  const offset = width - WIDTH
  return <>
    <path
      d={`M50 9H${640 + offset}c18 0 29 8 39 23l72 118-72 118c-10 15-21 23-39 23H50C27 291 9 273 9 250V50C9 27 27 9 50 9z`}
      fill={colors.plate}
    />
    <path
      d={`M52 27h${575 + offset}c15 0 23 5 31 18l64 105-64 105c-8 13-16 18-31 18H52c-14 0-25-11-25-25V52c0-14 11-25 25-25z`}
      fill="none"
      stroke={colors.border}
      strokeWidth={BORDER_STROKE}
    />
    <path
      d={`m${641 + offset} 50 60 100-60 100h-31l60-100-60-100z`}
      fill={colors.text}
    />
    <RoadNameText
      text={text}
      startX={layout.sideLeft}
      width={width - layout.sideLeft - layout.sideRight}
      layout={layout}
    />
  </>
}

function NumberedRouteSign({
  sign,
}: { sign?: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  if (!sign) {
    return <OrdinaryRoadSignSvg
      kind="ordinary-provincial"
      digits="206"
      x={282}
      y={70}
      width={360}
      height={173}
    />
  }
  if (sign.template === 'ordinary-road') {
    return <OrdinaryRoadSignSvg
      kind={sign.kind as OrdinaryRoadKind}
      digits={sign.digits}
      x={282}
      y={70}
      width={360}
      height={173}
    />
  }
  const naturalSize = expresswaySignNaturalSize(sign.code)
  const height = 174
  const width = Math.min(400, naturalSize.width / naturalSize.height * height)
  return <ExpresswaySignNode
    code={sign.code}
    kind={sign.kind as ExpresswayKind}
    provinceLabel={sign.provinceLabel}
    threeDigitDescend={sign.threeDigitDescend}
    fontChinese={fontChinese}
    fontLatin={fontLatin}
    x={282 + (360 - width) / 2}
    y={70}
    width={width}
    height={height}
  />
}

export function UrbanRoadNameSign({
  name,
  style = 'bidirectional',
  routeSign,
  leftDirection = '北',
  rightDirection = '南',
  x,
  y,
  width: renderedWidth,
  height: renderedHeight,
}: {
  name: string
  style?: UrbanRoadStyle
  routeSign?: Sign
  leftDirection?: string
  rightDirection?: string
  x?: number
  y?: number
  width?: number
  height?: number
}) {
  const colors = useSignColors()
  const font = useFont('a')
  const {
    text, width,
  } = urbanRoadNameNaturalSize(font, name, style)
  const layout = style === 'straight-route' ? undefined : NAME_LAYOUT[style]
  const label = style === 'straight-route'
    ? `${routeSign?.code || 'S206'} 城市道路编号指引标识`
    : `${text} 城市道路名称标识`

  return (
    <SignColorsProvider colors={colors}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        x={x}
        y={y}
        width={renderedWidth ?? width}
        height={renderedHeight ?? HEIGHT}
        role="img"
        aria-label={label}
      >
        {style === 'right-chevron' && layout ? <RightChevronPlate
          width={width}
          text={text}
          layout={layout}
        /> : <>
          <rect width={width} height={HEIGHT} rx={PLATE_RADIUS} fill={colors.plate} />
          <rect
            x={PLATE_PADDING}
            y={PLATE_PADDING}
            width={width - PLATE_PADDING * 2}
            height={HEIGHT - PLATE_PADDING * 2}
            rx={INNER_RADIUS}
            fill="none"
            stroke={colors.border}
            strokeWidth={BORDER_STROKE}
          />
          {style === 'bidirectional' && <>
            <path d="m52 150 42-58v116z" fill={colors.text} />
            <path d={`m${width - 52} 150-42-58v116z`} fill={colors.text} />
          </>}
          {style === 'bidirectional-hexagon' && <>
            <DirectionHexagon width={width} />
            <Dbold width={width} />
            <DirectionLabel
              centerX={DIRECTION_LABEL_SIDE}
              direction={leftDirection}
              letter={directionLetter(leftDirection)}
            />
            <DirectionLabel
              centerX={width - DIRECTION_LABEL_SIDE}
              direction={rightDirection}
              letter={directionLetter(rightDirection)}
            />
          </>}
          {style === 'unidirectional-hexagon' && <>
            <OneWayHexagon width={width} />
            <OneWayDbold width={width} />
            <DirectionLabel
              centerX={DIRECTION_LABEL_SIDE}
              direction={leftDirection}
              letter={directionLetter(leftDirection)}
            />
          </>}
          {style === 'straight-direction' && <>
            <StraightDir transform={ARROW_TRANSFORM} />
            <DirectionLabel
              centerX={(ARROW_SHAFT_LEFT_X + ARROW_SHAFT_RIGHT_X) / 2}
              direction={leftDirection}
              letter={directionLetter(leftDirection)}
              textBox={ARROW_DIRECTION_TEXT_BOX}
              letterBox={ARROW_DIRECTION_LETTER_BOX}
              fill={colors.plate}
            />
          </>}
          {style === 'straight-text' && <StraightArrow />}
          {style === 'straight-route' && <>
            <StraightArrow />
            <NumberedRouteSign sign={routeSign} />
          </>}
          {layout && <RoadNameText
            text={text}
            startX={layout.sideLeft}
            width={width - layout.sideLeft - layout.sideRight}
            layout={layout}
          />}
        </>}
      </svg>
    </SignColorsProvider>
  )
}
