import { useState, useEffect } from 'react'

const BASE = 'http://localhost:3001'

export function useFetch(path) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${BASE}${path}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(json => { setData(json.data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [path])

  return { data, loading, error }
}
