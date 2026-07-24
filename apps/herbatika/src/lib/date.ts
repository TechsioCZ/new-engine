export const addBusinessDays = (start: Date, daysToAdd: number): Date => {
  const date = new Date(start)
  let remainingDays = daysToAdd

  while (remainingDays > 0) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingDays -= 1
    }
  }

  return date
}

export const formatSkDate = (date: Date): string => {
  const day = `${date.getDate()}`.padStart(2, "0")
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const year = date.getFullYear()

  return `${day}.${month}.${year}`
}
