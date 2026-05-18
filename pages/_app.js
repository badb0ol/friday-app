import '../styles/globals.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('Friday SW registered:', reg.scope)
      }).catch(err => console.log('SW registration failed:', err))
    }
  }, [])

  return <Component {...pageProps} />
}
