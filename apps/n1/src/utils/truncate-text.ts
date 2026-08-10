export const truncateText = (text: string, maxWords = 3): string => {
  const words = text.split(" ")
  if (words.length <= maxWords) {
    return text
  }
  return words.slice(0, maxWords).join(" ")
}
