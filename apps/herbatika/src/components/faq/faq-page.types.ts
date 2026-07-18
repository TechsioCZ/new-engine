export type FaqLink = {
  href: string
  label: string
}

export type FaqAnswerBlock =
  | {
      type: "heading"
      text: string
    }
  | {
      type: "paragraph"
      text: string
    }
  | {
      type: "list"
      ordered?: boolean
      items: string[]
    }
  | {
      type: "links"
      items: FaqLink[]
    }

export type FaqItem = {
  id: string
  question: string
  updatedAt: string
  answer: FaqAnswerBlock[]
}
