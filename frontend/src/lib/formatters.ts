import i18n from '@/lib/i18n'

/**
 * Format date based on current active language
 */
export function formatDate(
  dateInput: string | number | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput

  if (isNaN(date.getTime())) return ''

  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  }

  return new Intl.DateTimeFormat(locale, defaultOptions).format(date)
}

/**
 * Format currency amount based on currency and active language
 */
export function formatCurrency(
  amount: number,
  currency: 'VND' | 'USD' = i18n.language === 'vi' ? 'VND' : 'USD'
): string {
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount)
}

/**
 * Format relative time (e.g. 5 minutes ago / 5 phút trước)
 */
export function formatRelativeTime(dateInput: string | number | Date): string {
  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput

  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return i18n.t('notifications.justNow')
  if (minutes < 60) return i18n.t('notifications.minutesAgo', { count: minutes })
  if (hours < 24) return i18n.t('notifications.hoursAgo', { count: hours })
  if (days < 7) return i18n.t('notifications.daysAgo', { count: days })
  
  return formatDate(date)
}
