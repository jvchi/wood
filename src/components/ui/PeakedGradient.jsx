import { useId } from 'react'

const DEFAULT_COLORS = ['#B6C9FF', '#8AA8FF', '#285fff', '#0041ff', '#000000']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function PeakedGradient({
  className = '',
  style,
  colors = DEFAULT_COLORS,
  peakHeight = 100,
  pointiness = 50,
  blur = 50,
  ...props
}) {
  const classNames = ['peaked-gradient', className].filter(Boolean).join(' ')
  const gradientId = useId()
  const id = suffix => `${gradientId}-${suffix}`
  const [tintLight, tintMid, tintDeep, accent, base] = [...colors, ...DEFAULT_COLORS].slice(0, 5)
  const height = clamp(Number(peakHeight) || 0, 0, 100)
  const sharpness = clamp(Number(pointiness) || 0, 0, 100)
  const blurScale = clamp(Number(blur) || 0, 0, 100) / 50
  const crest = 88 - height * 0.645
  const shoulder = crest + 5.3
  const innerCrest = crest + 24
  const baseCrest = crest + 44
  const spread = 18 + sharpness * 0.64
  const innerSpread = 50 - sharpness * 0.25
  const baseSpread = 27 + sharpness * 0.12

  return (
    <div className={classNames} style={style} {...props}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={id('base')} gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="50" y2="100">
            <stop offset="70%" stopColor={base} stopOpacity="0.2" />
            <stop offset="87%" stopColor={base} stopOpacity="1" />
          </linearGradient>
          <linearGradient id={id('accent')} gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="50" y2="100">
            <stop offset="47%" stopColor={tintDeep} stopOpacity="0" />
            <stop offset="70%" stopColor={accent} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={id('tint-a')} gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="50" y2="100">
            <stop offset="30%" stopColor={tintDeep} stopOpacity="0.02" />
            <stop offset="40%" stopColor={tintDeep} stopOpacity="0.3" />
            <stop offset="70%" stopColor={tintLight} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id('tint-b')} gradientUnits="userSpaceOnUse" x1="50" y1="0" x2="50" y2="100">
            <stop offset="20%" stopColor={tintDeep} stopOpacity="0" />
            <stop offset="50%" stopColor={tintDeep} stopOpacity="0.2" />
            <stop offset="100%" stopColor={tintMid} stopOpacity="0.4" />
          </linearGradient>
          <filter id={id('blur-0')} x="-50%" y="-100%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={7 * blurScale} />
          </filter>
          <filter id={id('blur-1')} x="-50%" y="-100%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={6 * blurScale} />
          </filter>
          <filter id={id('blur-2')} x="-50%" y="-100%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={5 * blurScale} />
          </filter>
          <filter id={id('blur-3')} x="-50%" y="-100%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={3 * blurScale} />
          </filter>
        </defs>
        <path
          d={`M -20 100 Q ${50 - spread / 2} ${crest}, 50 ${crest} Q ${50 + spread / 2} ${crest}, 120 100 L 120 150 L -20 150 Z`}
          fill={`url(#${id('tint-b')})`}
          filter={`url(#${id('blur-0')})`}
        />
        <path
          d={`M -20 100 Q ${50 - spread / 3.2} ${shoulder}, 50 ${shoulder} Q ${50 + spread / 3.2} ${shoulder}, 120 100 L 120 150 L -20 150 Z`}
          fill={`url(#${id('tint-a')})`}
          filter={`url(#${id('blur-1')})`}
        />
        <path
          d={`M -12.5 100 Q ${50 - innerSpread / 2} ${innerCrest}, 50 ${innerCrest} Q ${50 + innerSpread / 2} ${innerCrest}, 112.5 100 L 112.5 150 L -12.5 150 Z`}
          fill={`url(#${id('accent')})`}
          filter={`url(#${id('blur-2')})`}
        />
        <path
          d={`M -10 100 Q ${50 - baseSpread} ${baseCrest}, 50 ${baseCrest} Q ${50 + baseSpread} ${baseCrest}, 110 100 L 110 150 L -10 150 Z`}
          fill={`url(#${id('base')})`}
          filter={`url(#${id('blur-3')})`}
        />
      </svg>
    </div>
  )
}

export default PeakedGradient
