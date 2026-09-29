/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'vue-virtual-scroller' {
  import type { DefineComponent } from 'vue'
  export const DynamicScroller: DefineComponent<Record<string, unknown>, object, unknown>
  export const DynamicScrollerItem: DefineComponent<Record<string, unknown>, object, unknown>
  export const RecycleScroller: DefineComponent<Record<string, unknown>, object, unknown>
}

declare module 'keli-heatmap.js' {
  interface HeatmapPoint {
    x: number
    y: number
    value: number
  }

  interface HeatmapData {
    max: number
    min?: number
    data: HeatmapPoint[]
  }

  interface HeatmapInstance {
    _renderer: { canvas: HTMLCanvasElement }
    setData(data: HeatmapData): void
  }

  interface HeatmapConfig {
    container: HTMLElement
    gradient?: Record<string, string>
    blur?: number
    radius?: number
    maxOpacity?: number
    minOpacity?: number
    width?: number
    height?: number
  }

  function create(config: HeatmapConfig): HeatmapInstance
  export = create
}

declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number
    angle?: number
    spread?: number
    startVelocity?: number
    decay?: number
    gravity?: number
    drift?: number
    ticks?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    shapes?: ('square' | 'circle')[]
    scalar?: number
    zIndex?: number
    disableForReducedMotion?: boolean
  }

  interface ShapeFromPathOptions {
    path: string
    matrix?: number[]
  }

  interface ShapeFromTextOptions {
    text: string
    scalar?: number
    color?: string
    fontFamily?: string
  }

  interface PathShape {
    type: 'path'
    path: string
    matrix: number[]
  }

  interface BitmapShape {
    type: 'bitmap'
    bitmap: ImageBitmap
    matrix: number[]
  }

  type CustomShape = PathShape | BitmapShape

  interface Confetti {
    (options?: Options): Promise<null>
    reset(): void
    create(canvas: HTMLCanvasElement, options?: { resize?: boolean; useWorker?: boolean }): Confetti
    shapeFromPath(pathData: string | ShapeFromPathOptions): PathShape
    shapeFromText(textData: string | ShapeFromTextOptions): BitmapShape
  }

  const confetti: Confetti
  export default confetti
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
