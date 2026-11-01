/**
 * 全项目统一色板。
 *
 * 颜色名称与「基本含义」按 GB 5768.2—2022 表 1（标志颜色的基本含义，见标准 PDF 第 14 页）整理；
 * 表 2 规定了各类标志的「底色 / 图形字符 / 边框」分别取哪几种颜色。生成器和设置面板都从这里取色，
 * 不要再在别处写死色值。
 *
 * 一种颜色只对应一个「基准色值」（SIGN_COLORS）。实物牌面因为各地厂家、反光膜和喷印设备不同，
 * 同一个「蓝色」会偏深偏浅，所以另配一份色板：每种颜色可以挂若干色值（DEFAULT_COLOR_SWATCHES 是
 * 项目里用过的历史色值，用户还能在设置面板里继续往某个颜色下加自己的色值），方便快速套用。
 *
 * 注意：标准只规定色品坐标（引用 GB/T 8416），PDF 里没有直接给色值，这里的 hex 是项目实现值。
 */

/** 反光标牌上更鲜艳的那版蓝色（城市道路名称牌默认用它）。 */
export const BRIGHT_BLUE = '#006AF5'

/** 基准色值（每种颜色一个）。 */
export const SIGN_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#EE2D2D',
  blue: '#2C64AD',
  green: '#359B47',
  brown: '#8A5A32',
  yellow: '#F4EB35',
  fluorescentYellow: '#F0FF33',
  yellowGreen: '#CCFF33',
  orange: '#FF7F00',
  fluorescentOrange: '#FF5C00',
  pink: '#FF6699',
  fluorescentPink: '#FF2E88',
} as const

export type SignColorKey = keyof typeof SIGN_COLORS

export interface PaletteEntry {
  key: SignColorKey
  name: string
  /** GB 5768.2—2022 表 1 里的「基本含义」 */
  usage: string
}

export const SIGN_PALETTE: readonly PaletteEntry[] = [
  {
    key: 'red',
    name: '红色',
    usage: '表示停止、禁止、限制',
  },
  {
    key: 'blue',
    name: '蓝色',
    usage: '表示指令、遵循；表示一般道路指路信息',
  },
  {
    key: 'yellow',
    name: '黄色',
    usage: '表示警告',
  },
  {
    key: 'fluorescentYellow',
    name: '荧光黄色',
    usage: '表示警告',
  },
  {
    key: 'yellowGreen',
    name: '荧光黄绿色',
    usage: '表示与行人有关的警告',
  },
  {
    key: 'green',
    name: '绿色',
    usage: '表示高速公路和城市快速路指路信息',
  },
  {
    key: 'brown',
    name: '棕色',
    usage: '表示旅游区指路信息',
  },
  {
    key: 'orange',
    name: '橙色',
    usage: '表示因作业引起的道路或车道使用发生变化',
  },
  {
    key: 'fluorescentOrange',
    name: '荧光橙色',
    usage: '表示因作业引起的道路或车道使用发生变化',
  },
  {
    key: 'pink',
    name: '粉红色',
    usage: '表示因交通事故处理引起的道路或车道使用发生变化',
  },
  {
    key: 'fluorescentPink',
    name: '荧光粉红色',
    usage: '表示因交通事故处理引起的道路或车道使用发生变化',
  },
  {
    key: 'black',
    name: '黑色',
    usage: '用于标志的文字、图形符号和部分标志边框',
  },
  {
    key: 'white',
    name: '白色',
    usage: '用于标志的底色、文字和图形符号以及部分标志的边框',
  },
]

/**
 * 每种颜色默认带的色板色值（项目里实际出现过的值都保留下来，统一只是统一「默认取哪个」）。
 * 蓝色第一个是基准色，第二个是反光标牌上更鲜艳的那版。
 */
export const DEFAULT_COLOR_SWATCHES: Record<SignColorKey, readonly string[]> = {
  red: ['#EE2D2D', '#EE2525'],
  blue: ['#2C64AD', BRIGHT_BLUE, '#2864B7', '#1769AA', '#0B43B8'],
  yellow: ['#F4EB35'],
  fluorescentYellow: ['#F0FF33'],
  yellowGreen: ['#CCFF33'],
  green: ['#359B47', '#299B48', '#369D48', '#148050'],
  brown: ['#8A5A32', '#8A5A36'],
  orange: ['#FF7F00'],
  fluorescentOrange: ['#FF5C00'],
  pink: ['#FF6699'],
  fluorescentPink: ['#FF2E88'],
  black: ['#000000'],
  white: ['#FFFFFF'],
}

export const signColorHex = (key: SignColorKey) => SIGN_COLORS[key]

/** 找出某个色值属于哪个颜色（色板分组用），找不到返回 undefined。 */
export const paletteEntryOf = (hex: string) => {
  const target = String(hex).toUpperCase()
  return SIGN_PALETTE.find(entry => SIGN_COLORS[entry.key].toUpperCase() === target)
}
