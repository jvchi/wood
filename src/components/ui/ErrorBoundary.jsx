import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info)
    console.error('ErrorBoundary caught:', error, info)
  }

  componentDidUpdate(prevProps) {
    if (!this.state.hasError) return
    if (!this.props.resetKeys) return
    if (prevProps.resetKeys?.length !== this.props.resetKeys.length) {
      this.setState({ hasError: false })
      return
    }

    const resetKeyChanged = this.props.resetKeys.some((key, index) => !Object.is(key, prevProps.resetKeys[index]))
    if (resetKeyChanged) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback()
      }

      return this.props.fallback || null
    }
    return this.props.children
  }
}
