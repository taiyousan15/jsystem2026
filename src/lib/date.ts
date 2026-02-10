const JST_OFFSET = 9 * 60 * 60 * 1000

export function toJST(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET)
}

export function todayJST(): Date {
  const now = new Date()
  const jst = toJST(now)
  return new Date(jst.getFullYear(), jst.getMonth(), jst.getDate())
}

export function formatDateJST(date: Date): string {
  const jst = toJST(date)
  return `${jst.getFullYear()}/${String(jst.getMonth() + 1).padStart(2, '0')}/${String(jst.getDate()).padStart(2, '0')}`
}

export function formatDateTimeJST(date: Date): string {
  const jst = toJST(date)
  return `${formatDateJST(date)} ${String(jst.getHours()).padStart(2, '0')}:${String(jst.getMinutes()).padStart(2, '0')}`
}
