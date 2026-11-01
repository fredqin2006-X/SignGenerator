import {
  DEFAULT_COLOR_SWATCHES,
  SIGN_COLORS,
  SIGN_PALETTE,
  type SignColorKey,
} from './palette'

/**
 * 当前生效的色板：每种颜色一个色值。全项目的标志都从这里取色，
 * 所以只改这里就能让所有标志一起变色（各地厂家、反光膜、喷印设备做出来的
 * 同名颜色会有色差，正是需要这个的原因）。
 */
export type SignPalette = Record<SignColorKey, string>

/** 每种颜色备选的色值：默认值 + 用户自己存的。 */
export type ColorSwatches = Record<SignColorKey, string[]>

const PALETTE_STORAGE_KEY = 'expressway-sign-generator:palette'
const SWATCHES_STORAGE_KEY = 'expressway-sign-generator:color-swatches'

const HEX_COLOR = /^#[0-9A-F]{6}$/

/** 归一化成 `#RRGGBB`，不合法返回 null。 */
export const normalizeHex = (value: unknown) => {
  const hex = String(value ?? '').trim().toUpperCase()
  return HEX_COLOR.test(hex) ? hex : null
}

/** 默认色板：直接用 GB 5768.2—2022 的那套基准色值。 */
export function defaultPalette(): SignPalette {
  return Object.fromEntries(
    SIGN_PALETTE.map(entry => [entry.key, SIGN_COLORS[entry.key]]),
  ) as SignPalette
}

/** 默认色板：每种颜色带上项目里出现过的色值。 */
export function defaultSwatches(): ColorSwatches {
  return Object.fromEntries(
    SIGN_PALETTE.map(entry => [entry.key, [...DEFAULT_COLOR_SWATCHES[entry.key]]]),
  ) as ColorSwatches
}

/** 读取用户改过的色板，缺失或损坏的项回退到默认色值。 */
export function loadPalette(): SignPalette {
  const palette = defaultPalette()
  if (typeof window === 'undefined') {return palette}
  try {
    const raw = window.localStorage.getItem(PALETTE_STORAGE_KEY)
    if (!raw) {return palette}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const entry of SIGN_PALETTE) {
      const hex = normalizeHex(parsed?.[entry.key])
      if (hex) {palette[entry.key] = hex}
    }
  } catch {
    // 存储损坏时退回默认色板
  }
  return palette
}

/** 只存与默认值不同的项，默认色值仍然由代码维护。 */
export function savePalette(palette: SignPalette) {
  if (typeof window === 'undefined') {return}
  try {
    const defaults = defaultPalette()
    const changed: Record<string, string> = {
    }
    for (const entry of SIGN_PALETTE) {
      const hex = normalizeHex(palette[entry.key])
      if (hex && hex !== defaults[entry.key]) {changed[entry.key] = hex}
    }
    if (Object.keys(changed).length === 0) {
      window.localStorage.removeItem(PALETTE_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(changed))
  } catch {
    // 忽略写入失败（隐私模式等）
  }
}

/** 读取用户存下来的色板色值（默认 + 用户添加，去重）。 */
export function loadSwatches(): ColorSwatches {
  const swatches = defaultSwatches()
  if (typeof window === 'undefined') {return swatches}
  try {
    const raw = window.localStorage.getItem(SWATCHES_STORAGE_KEY)
    if (!raw) {return swatches}
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>
    for (const entry of SIGN_PALETTE) {
      const saved = parsed?.[entry.key]
      if (!Array.isArray(saved)) {continue}
      for (const value of saved) {
        const hex = normalizeHex(value)
        if (hex && !swatches[entry.key].includes(hex)) {swatches[entry.key].push(hex)}
      }
    }
  } catch {
    // 存储损坏时退回默认色板
  }
  return swatches
}

/** 只存用户自己加的值，默认值仍然由代码维护，升级时不会互相干扰。 */
export function saveSwatches(swatches: ColorSwatches) {
  if (typeof window === 'undefined') {return}
  try {
    const custom: Record<string, string[]> = {
    }
    for (const entry of SIGN_PALETTE) {
      const defaults = DEFAULT_COLOR_SWATCHES[entry.key].map(value => value.toUpperCase())
      const extra = swatches[entry.key].filter(value => !defaults.includes(value.toUpperCase()))
      if (extra.length > 0) {custom[entry.key] = extra}
    }
    if (Object.keys(custom).length === 0) {
      window.localStorage.removeItem(SWATCHES_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(SWATCHES_STORAGE_KEY, JSON.stringify(custom))
  } catch {
    // 忽略写入失败（隐私模式等）
  }
}

/** 往某个颜色的色板里加一个色值，已存在则原样返回。 */
export function addSwatch(
  swatches: ColorSwatches,
  key: SignColorKey,
  value: string,
): ColorSwatches {
  const hex = normalizeHex(value)
  if (!hex || swatches[key].some(item => item.toUpperCase() === hex)) {return swatches}
  return {
    ...swatches,
    [key]: [...swatches[key], hex],
  }
}

/** 从色板里移除一个色值（默认值不允许删）。 */
export function removeSwatch(
  swatches: ColorSwatches,
  key: SignColorKey,
  value: string,
): ColorSwatches {
  const defaults = DEFAULT_COLOR_SWATCHES[key].map(item => item.toUpperCase())
  if (defaults.includes(value.toUpperCase())) {return swatches}
  return {
    ...swatches,
    [key]: swatches[key].filter(item => item.toUpperCase() !== value.toUpperCase()),
  }
}
