import { fmt, tr } from '../../i18n'
import type { Mission } from '../levels/types'
import { variantChanges } from '../levels/variants'

/** «The conditions have changed»: after a missed prediction the given numbers are new, so the old landing spot is no answer. */
export function VariantNote({ written, variant, formal }: { written: Mission; variant: number; formal: boolean }) {
  const changes = variantChanges(written, variant)
  if (changes.length === 0) return null
  return (
    <div className="lab-panel lab-rise p-3 flex flex-col gap-1 border-l-4" style={{ borderLeftColor: 'var(--lab-info)' }} role="status">
      <div className="lab-label" style={{ color: 'var(--lab-info)' }}>
        {formal ? tr('Условия испытания изменены') : tr('Условия изменились')}
      </div>
      <div className="text-sm">
        {changes.map((c) => `${c.label} — ${fmt(c.value, 1, 0)} ${c.unit}`).join(', ')}.
      </div>
      <div className="text-xs" style={{ color: 'var(--lab-dim)' }}>
        {formal ? tr('Прошлый пуск больше не подсказка: пересчитайте по новым данным.') : tr('Прошлый бросок больше не подсказка: пересчитай по новым данным.')}
      </div>
    </div>
  )
}
