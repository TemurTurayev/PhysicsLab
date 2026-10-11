import { useLocale } from './index'

// Tests check the Russian source texts (hint rules, formal wording), so they run in Russian.
useLocale.setState({ locale: 'ru' })
