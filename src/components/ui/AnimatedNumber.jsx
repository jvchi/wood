import NumberFlow, { useCanAnimate } from '@number-flow/react'

const numberTiming = {
  duration: 260,
  easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
}

const opacityTiming = {
  duration: 160,
  easing: 'ease-out',
}

const currencyFormat = (currency) => ({
  style: 'currency',
  currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export default function AnimatedNumber({
  value,
  className = '',
  locales = 'en-US',
  format,
  prefix,
  suffix,
  ...props
}) {
  const canAnimate = useCanAnimate({ respectMotionPreference: true })
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0

  return (
    <NumberFlow
      value={numericValue}
      locales={locales}
      format={format}
      prefix={prefix}
      suffix={suffix}
      isolate
      animated={canAnimate}
      transformTiming={numberTiming}
      spinTiming={numberTiming}
      opacityTiming={opacityTiming}
      className={`animated-number ${className}`.trim()}
      {...props}
    />
  )
}

export function AnimatedCurrency({ value, currency = 'USD', ...props }) {
  return (
    <AnimatedNumber
      value={value}
      format={currencyFormat(currency)}
      {...props}
    />
  )
}
