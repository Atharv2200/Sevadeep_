import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import About from './sections/About'
import Activities from './sections/Activities'
import GetInvolved from './sections/GetInvolved'
import Hero from './sections/Hero'

export default function Home() {
  const location = useLocation()

  // In-page links are router links such as /#about: scroll to the section (or to
  // the top for "/") whenever the location changes, including a repeat click.
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null
    if (target) target.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [location.pathname, location.hash, location.key])

  return (
    <>
      <Hero />
      <About />
      <Activities />
      <GetInvolved />
    </>
  )
}
