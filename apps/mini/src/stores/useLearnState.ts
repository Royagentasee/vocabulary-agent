import { useEffect, useState } from 'react'
import { getState, subscribe } from './learnStore'

export function useLearnState() {
  const [, setVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = subscribe(() => setVersion((v) => v + 1))
    return unsubscribe
  }, [])
  return getState()
}