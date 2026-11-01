import {
  textLayout,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

export interface FitTarget {
  text: string
  width: number
}

// Largest character height (<= maxHeight) at which every target fits its own
// width, given a fixed letter gap of `gapRatio * height`. Use the result for all
// labels of a sign so they share one character size instead of each label
// shrinking independently.
export function fittedTextHeight(
  font: Font,
  targets: FitTarget[],
  maxHeight: number,
  gapRatio: number,
  referenceText: string,
) {
  // Glyph widths and gaps both scale linearly with height, so measure at 1.
  return targets.reduce((height, {
    text, width,
  }) => {
    const glyphCount = Array.from(text).length
    if (!glyphCount || width <= 0) { return height }
    const unit = textLayout(font, text, 1, {
      scaleMode: 'reference',
      referenceText,
    })
    const widthPerUnitHeight = unit.usedWidth + gapRatio * (glyphCount - 1)
    return Math.min(height, width / widthPerUnitHeight)
  }, maxHeight)
}
