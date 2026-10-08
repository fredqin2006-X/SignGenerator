import {
  Component, memo, type ErrorInfo, type ReactNode,
} from 'react'

import {
  SignSvg,
} from '@/generators/generator'
import type {
  Sign,
} from '@/lib/types'
import {
  cn,
} from '@/lib/utils'

const NO_ROAD_SIGNS: Sign[] = []

interface SignThumbnailProps {
  sign: Sign
  roadSignList?: Sign[]
  className?: string
}

interface ThumbnailBoundaryState {
  failed: boolean
}

class ThumbnailBoundary extends Component<{ children: ReactNode }, ThumbnailBoundaryState> {
  state: ThumbnailBoundaryState = {
    failed: false,
  }

  static getDerivedStateFromError() {
    return {
      failed: true,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('标志缩略图渲染失败', error, info)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function roadSignListEqual(previous: Sign[], next: Sign[]) {
  if (previous === next) {return true}
  if (previous.length !== next.length) {return false}
  return previous.every((sign, index) => {
    const other = next[index]
    if (sign === other) {return true}
    return sign.id === other.id
      && sign.code === other.code
      && sign.name === other.name
      && sign.urbanRoadName === other.urbanRoadName
      && sign.urbanRoadStyle === other.urbanRoadStyle
  })
}

function SignThumbnailBase({
  sign, roadSignList = NO_ROAD_SIGNS, className,
}: SignThumbnailProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-9 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border/70 bg-muted/40 max-md:h-12 max-md:w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full',
        className,
      )}
    >
      <ThumbnailBoundary key={JSON.stringify(sign)}>
        <SignSvg sign={sign} roadSignList={roadSignList} />
      </ThumbnailBoundary>
    </span>
  )
}

export const SignThumbnail = memo(SignThumbnailBase, (previous, next) =>
  previous.sign === next.sign
  && previous.className === next.className
  && roadSignListEqual(previous.roadSignList ?? NO_ROAD_SIGNS, next.roadSignList ?? NO_ROAD_SIGNS))
