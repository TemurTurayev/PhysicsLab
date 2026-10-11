// Prints release angle → launch and landing for the default trebuchet, to place mission targets.
import { simulateShot } from '../src/lab/sim/shot'
import { DEFAULT_TREBUCHET, EARTH } from '../src/lab/sim/types'

for (let deg = 200; deg >= 20; deg -= 10) {
  const s = simulateShot({ trebuchet: { ...DEFAULT_TREBUCHET, releaseDeg: deg }, world: EARTH })
  const row = s.launch
    ? `v=${s.launch.speed.toFixed(1)} angle=${s.launch.angleDeg.toFixed(1)} land=${s.landing?.x.toFixed(1)} apex=${s.apex?.y.toFixed(1)} tRel=${s.releaseT?.toFixed(2)}`
    : 'no release'
  console.log(String(deg).padStart(4), row)
}
