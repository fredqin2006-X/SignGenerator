import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'

import {
  SIGN_PALETTE,
  type SignColorKey,
} from '@/lib/palette'
import {
  usePalette,
} from '@/lib/palette-context'
import type {
  SignPalette,
} from '@/lib/palette-store'
import type {
  Sign, SignTemplate,
} from '@/lib/types'

/**
 * 一块牌面上用到的三类颜色。生成器只认这三个角色，
 * 具体色值由全局色板决定（标题栏可改）。
 */
export interface SignColors {
  /** 底色 */
  plate: string
  /** 文字与图形符号 */
  text: string
  /** 边框 */
  border: string
  /** 按色板取任意一种颜色，用于一块牌上出现多种配色的场景。 */
  resolve: (key: SignColorKey) => string
  /** 把模板 SVG 里写死的色值换成当前色板的值。 */
  applyTemplate: (template: string) => string
}

const FALLBACK_PALETTE = Object.fromEntries(
  SIGN_PALETTE.map(entry => [entry.key, '#FFFFFF']),
) as SignPalette

/** 每种标志的底色取色板里的哪个颜色（文字和边框另按明暗决定）。 */
const TEMPLATE_PLATE_KEYS: Record<SignTemplate, SignColorKey> = {
  'expressway': 'green',
  'urban-road-name': 'blue',
  'urban-expressway-road-name': 'green',
  'ordinary-road': 'blue',
  'direction-guidance': 'green',
  'road-fork-preview': 'green',
  'two-lane-interchange-exit': 'green',
  'dual-exit-interchange-preview': 'green',
  'dual-direction-exit-preview': 'green',
  'urban-expressway-exit-preview': 'green',
  'urban-expressway-entrance-preview': 'green',
  'entrance-preview-two-directions': 'green',
  'standard-exit-sign': 'green',
  'ordinary-road-exit': 'blue',
  'intersection-guidance': 'blue',
  'crossroads-guidance': 'blue',
  'roundabout-guidance': 'blue',
  'destination-distance': 'blue',
  'free-mode': 'blue',
}

/** 浅底色配黑字，深底色配白字。 */
const LIGHT_PLATES: readonly SignColorKey[] = [
  'white',
  'yellow',
  'fluorescentYellow',
  'yellowGreen',
]

/** 标志自己的背景选项（自由标志 / 地点距离 / 普通道路出口）直接就是色板颜色名。 */
function plateKeyOf(sign: Sign): SignColorKey {
  if (sign.template === 'free-mode') {return sign.freeConfig.background}
  if (sign.template === 'destination-distance') {return sign.destinationDistanceConfig.background}
  if (sign.template === 'ordinary-road-exit') {return sign.ordinaryExitBackground}
  return TEMPLATE_PLATE_KEYS[sign.template] ?? 'blue'
}

/** 模板 SVG 里写死的色值属于哪种颜色。 */
const TEMPLATE_COLOR_KEYS: Record<string, SignColorKey> = {
  '#359B47': 'green',
  '#369D48': 'green',
  '#2C64AD': 'blue',
  '#F4EB35': 'yellow',
  '#FFFFFF': 'white',
}

const TEMPLATE_HEX = /#[0-9a-fA-F]{6}/g

/**
 * 模板 SVG 是设计稿直接导出的，里面写死了色值（绿色还分了 #359b47 / #369d48 两种），
 * 渲染前统一换成当前色板的值。
 */
export function applyTemplatePalette(template: string, palette: SignPalette) {
  return template.replace(TEMPLATE_HEX, (hex) => {
    const key = TEMPLATE_COLOR_KEYS[hex.toUpperCase()]
    return key ? palette[key] ?? hex : hex
  })
}

/** 按标志类型 + 当前色板算出三色。 */
export function resolveSignColors(sign: Sign, palette: SignPalette): SignColors {
  const plateKey = plateKeyOf(sign)
  const textKey: SignColorKey = LIGHT_PLATES.includes(plateKey) ? 'black' : 'white'
  return {
    plate: palette[plateKey],
    text: palette[textKey],
    border: palette[textKey],
    resolve: key => palette[key],
    applyTemplate: template => applyTemplatePalette(template, palette),
  }
}

const DEFAULT_SIGN_COLORS: SignColors = {
  plate: '#2C64AD',
  text: '#FFFFFF',
  border: '#FFFFFF',
  resolve: key => FALLBACK_PALETTE[key] ?? '#FFFFFF',
  applyTemplate: template => template,
}

const SignColorsContext = createContext<SignColors>(DEFAULT_SIGN_COLORS)

/**
 * 按某条标志自己的类型取色。内嵌别的标志时（比如地点距离里的道路名称牌）
 * 用它框住，免得子标志跟着父标志的底色走。
 */
export function SignColorScope({
  sign, children,
}: { sign: Sign; children: ReactNode }) {
  const {
    palette,
  } = usePalette()
  const colors = useMemo(() => resolveSignColors(sign, palette), [sign, palette])
  return <SignColorsContext.Provider value={colors}>
    {children}
  </SignColorsContext.Provider>
}

/** 各生成器取当前牌面颜色：底色用 `plate`，文字图形用 `text`，边框用 `border`。 */
export const useSignColors = () => useContext(SignColorsContext)

/**
 * 按标志类型取色。给「自己就是一块牌」的组件用（城市道路名称牌、编号牌等），
 * 这样它被内嵌到别的标志里时也不会跟着外层底色走。
 */
export function useTemplateColors(template: SignTemplate): SignColors {
  const {
    palette,
  } = usePalette()
  return useMemo(() => {
    const plateKey = TEMPLATE_PLATE_KEYS[template] ?? 'blue'
    const textKey: SignColorKey = LIGHT_PLATES.includes(plateKey) ? 'black' : 'white'
    return {
      plate: palette[plateKey],
      text: palette[textKey],
      border: palette[textKey],
      resolve: key => palette[key],
      applyTemplate: (source: string) => applyTemplatePalette(source, palette),
    }
  }, [template, palette])
}

/** `colors` 由上层 memo 好（SignColorScope / useTemplateColors），这里直接透传。 */
export function SignColorsProvider({
  colors, children,
}: { colors: SignColors; children: ReactNode }) {
  return <SignColorsContext.Provider value={colors}>
    {children}
  </SignColorsContext.Provider>
}
