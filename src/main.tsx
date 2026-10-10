import './index.css'
import { loadLocale, useLocale } from './i18n'

// Texts are translated when modules load, so the language's dictionary comes first, then the app.
// Switching the language reloads the page: every text is rebuilt in the new language.
const { locale } = useLocale.getState()
document.documentElement.lang = locale
useLocale.subscribe((s, prev) => {
  if (s.locale !== prev.locale) window.location.reload()
})
loadLocale(locale)
  .catch(() => useLocale.setState({ locale: 'ru' }))
  .then(() => import('./boot.tsx'))
