"use client"

import { Component } from "react"
import type { ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode | ((error: Error) => ReactNode)
  onError?: (error: Error) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  override render(): ReactNode {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error !== null) {
      return typeof fallback === "function" ? fallback(error) : fallback
    }

    return children
  }
}
