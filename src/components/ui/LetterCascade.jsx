import { useCallback, useEffect, useState } from 'react'
import { motion, stagger, useAnimate, useReducedMotion } from 'framer-motion'

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function LetterCascade({
  text,
  className,
  letterClassName,
  staggerDuration = 0.04,
  staggerFrom = 'first',
  stiffness = 220,
  damping = 16,
  triggerOnClick = false,
  autoIntervalMs = 0,
  onComplete,
}) {
  const [scope, animate] = useAnimate()
  const [blocked, setBlocked] = useState(false)
  const reduceMotion = useReducedMotion()

  const trigger = useCallback(() => {
    if (blocked) return
    setBlocked(true)

    const merge = base => ({
      ...base,
      delay: stagger(staggerDuration, { from: staggerFrom }),
    })

    const spring = {
      type: 'spring',
      stiffness,
      damping,
    }

    animate(
      '.cascade-front',
      {
        rotateX: 90,
        opacity: 0,
        y: -6,
        filter: 'blur(4px)',
      },
      merge(spring),
    ).then(() => {
      animate(
        '.cascade-front',
        { rotateX: 0, opacity: 1, y: 0, filter: 'blur(0px)' },
        { duration: 0 },
      ).then(() => {
        setBlocked(false)
        onComplete?.()
      })
    })

    animate(
      '.cascade-echo',
      {
        rotateX: 0,
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
      },
      merge(spring),
    ).then(() => {
      animate(
        '.cascade-echo',
        {
          rotateX: -90,
          opacity: 0,
          y: 6,
          scale: 0.8,
          filter: 'blur(4px)',
        },
        { duration: 0 },
      )
    })
  }, [blocked, animate, staggerDuration, staggerFrom, stiffness, damping, onComplete])

  useEffect(() => {
    if (!autoIntervalMs || reduceMotion) return undefined

    const interval = window.setInterval(() => {
      trigger()
    }, autoIntervalMs)

    return () => window.clearInterval(interval)
  }, [autoIntervalMs, reduceMotion, trigger])

  return (
    <span
      ref={scope}
      className={cx(
        'inline-flex cursor-pointer select-none items-center justify-center',
        className,
      )}
      {...(triggerOnClick ? { onClick: trigger } : { onMouseEnter: trigger })}
      aria-label={text}
    >
      {text.split('').map((letter, i) => (
        <span
          key={i}
          className="relative inline-flex whitespace-pre"
          style={{ perspective: '500px' }}
        >
          <motion.span
            className={cx('cascade-front inline-block', letterClassName)}
            style={{
              rotateX: 0,
              y: 0,
              transformOrigin: 'bottom center',
              backfaceVisibility: 'hidden',
            }}
          >
            {letter}
          </motion.span>

          <motion.span
            className={cx('cascade-echo absolute inset-0 inline-block', letterClassName)}
            style={{
              rotateX: -90,
              opacity: 0,
              y: 6,
              scale: 0.8,
              filter: 'blur(4px)',
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
            }}
          >
            {letter}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

export default LetterCascade
