import { createContext, type RefObject } from 'react'

// A stable DOM container for drei <Html> overlays. Without an explicit portal, <Html>
// targets the R3F event source, which changes during mount and forces a root remount.
export const OverlayContext = createContext<RefObject<HTMLElement> | undefined>(undefined)
