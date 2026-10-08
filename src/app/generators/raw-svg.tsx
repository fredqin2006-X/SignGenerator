import type {
  ReactNode,
} from 'react'

import {
  useSignColors,
} from './sign-colors'

interface RawSvgProps {
  template: string
  label: string
  x?: number
  y?: number
  width?: number | string
  height?: number | string
  children?: ReactNode
}

const extractInner = (template: string) =>
  template
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>[\s\S]*$/i, '')

const extractViewBox = (template: string) => {
  const match = /<svg[^>]*\sviewBox=["']([^"']+)["']/i.exec(template)
  return match?.[1]
}

export function RawSvg({
  template, label, x, y, width, height, children,
}: RawSvgProps) {
  const {
    applyTemplate,
  } = useSignColors()
  // 模板 SVG 里写死的色值（#359b47 / #2c64ad / #f4eb35 / #ffffff）统一换成色板值。
  const inner = extractInner(applyTemplate(template))
  const viewBox = extractViewBox(template)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      viewBox={viewBox}
      x={x}
      y={y}
      width={width}
      height={height}
    >
      <g dangerouslySetInnerHTML={{
        __html: inner,
      }} />
      {children}
    </svg>
  )
}
