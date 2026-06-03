import { cookies } from 'next/headers'
import { getTranslation, type Locale, type TranslationKey } from './i18n'

const COOKIE_NAME = 'tibia_lang'

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies()
  const val = store.get(COOKIE_NAME)?.value
  if (val === 'pt' || val === 'en' || val === 'es') return val
  return 'pt'
}

export async function getServerT() {
  const lang = await getServerLocale()
  return (key: TranslationKey) => getTranslation(lang, key)
}
