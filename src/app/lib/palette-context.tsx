'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  addSwatch as addSwatchTo,
  defaultPalette,
  defaultSwatches,
  loadPalette,
  loadSwatches,
  removeSwatch as removeSwatchFrom,
  savePalette,
  saveSwatches,
  type ColorSwatches,
  type SignPalette,
} from './palette-store'

import type {
  SignColorKey,
} from './palette'

interface PaletteContextValue {
  /** 当前生效的色板（每种颜色一个色值）。 */
  palette: SignPalette
  /** 每种颜色备选的色值。 */
  swatches: ColorSwatches
  /** 改某种颜色的色值，全项目所有用到它的标志会一起变。 */
  setColor: (key: SignColorKey, hex: string) => void
  /** 把某种颜色恢复成基准色值。 */
  resetColor: (key: SignColorKey) => void
  /** 全部恢复默认。 */
  resetPalette: () => void
  /** 往某种颜色的色板里存一个色值。 */
  addSwatch: (key: SignColorKey, hex: string) => void
  /** 从色板里删掉一个自定义色值。 */
  removeSwatch: (key: SignColorKey, hex: string) => void
}

const NOOP = () => {
}

const PaletteContext = createContext<PaletteContextValue>({
  palette: defaultPalette(),
  swatches: defaultSwatches(),
  setColor: NOOP,
  resetColor: NOOP,
  resetPalette: NOOP,
  addSwatch: NOOP,
  removeSwatch: NOOP,
})

/**
 * 全局色板。所有标志的颜色一律从这里取，所以「统一色板」只需要改这一处：
 * 标题栏的色板面板改的就是 `palette`。
 */
export function PaletteProvider({
  children,
}: { children: ReactNode }) {
  const [palette, setPalette] = useState<SignPalette>(defaultPalette)
  const [swatches, setSwatches] = useState<ColorSwatches>(defaultSwatches)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPalette(loadPalette())
    setSwatches(loadSwatches())
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const setColor = useCallback((key: SignColorKey, hex: string) => {
    setPalette((current) => {
      const next = {
        ...current,
        [key]: hex.toUpperCase(),
      }
      savePalette(next)
      return next
    })
  }, [])

  const resetColor = useCallback((key: SignColorKey) => {
    setPalette((current) => {
      const next = {
        ...current,
        [key]: defaultPalette()[key],
      }
      savePalette(next)
      return next
    })
  }, [])

  const resetPalette = useCallback(() => {
    const next = defaultPalette()
    savePalette(next)
    setPalette(next)
  }, [])

  const addSwatch = useCallback((key: SignColorKey, hex: string) => {
    setSwatches((current) => {
      const next = addSwatchTo(current, key, hex)
      saveSwatches(next)
      return next
    })
  }, [])

  const removeSwatch = useCallback((key: SignColorKey, hex: string) => {
    setSwatches((current) => {
      const next = removeSwatchFrom(current, key, hex)
      saveSwatches(next)
      return next
    })
  }, [])

  const value = useMemo<PaletteContextValue>(() => ({
    palette,
    swatches,
    setColor,
    resetColor,
    resetPalette,
    addSwatch,
    removeSwatch,
  }), [
    palette,
    swatches,
    setColor,
    resetColor,
    resetPalette,
    addSwatch,
    removeSwatch,
  ])

  return <PaletteContext.Provider value={value}>
    {children}
  </PaletteContext.Provider>
}

export const usePalette = () => useContext(PaletteContext)
