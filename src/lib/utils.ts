import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

export function cloudinaryThumb(url: string, width = 400, height = 300): string {
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`)
}

export function formatDistanceToNow(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'şimdi'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}s önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}g önce`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}h önce`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}ay önce`
  return `${Math.floor(months / 12)}y önce`
}
