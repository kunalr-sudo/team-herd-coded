import { Html } from '@react-three/drei'
import { useContext, type ComponentProps } from 'react'
import { OverlayContext } from './overlayContext'

export default function SceneHtml(props: ComponentProps<typeof Html>) {
  const portal = useContext(OverlayContext)
  return <Html {...props} portal={portal} />
}
