// Legend metadata shared by the floor heatmap and the HUD.
export const HEATMAP_LEGEND = {
  germ: { label: 'Airborne germ load', lo: 'clean', hi: 'heavy plume', gradient: 'linear-gradient(90deg,#facc1500,#facc15,#f97316,#ef4444)' },
  heat: { label: 'Effective THI', lo: '70', hi: '90+', gradient: 'linear-gradient(90deg,#1e40af,#22c55e,#facc15,#f97316,#dc2626)' },
  ammonia: { label: 'Ammonia NH₃', lo: '0 ppm', hi: '35+ ppm', gradient: 'linear-gradient(90deg,#581c8700,#7e22ce,#c026d3,#f472b6)' },
}
