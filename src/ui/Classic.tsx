import { categories, featuredProject, owner, projects } from '../data/portfolio'
import { setState, useStore } from '../state/store'
import { About, Contact, Experience, Home, ProjectDetail } from './content'

/**
 * Conventional single-page portfolio. Used when the visitor chooses it, when
 * WebGL is unavailable, or when the 3D scene fails to start. Same data as the
 * shop, plain semantic HTML.
 */
export function Classic() {
  const webglFailed = useStore((s) => s.webglFailed)
  return (
    <div className="classic">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="classic-head">
        <div>
          <p className="eyebrow">Vinyl Ecstatic</p>
          <h1>{owner.name}</h1>
        </div>
        <nav aria-label="Sections">
          <a href="#projects">Projects</a>
          <a href="#experience">Experience</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          {!webglFailed && (
            <button
              className="btn small primary"
              onClick={() => {
                setState({ classic: false })
                history.replaceState(null, '', location.pathname)
              }}
            >
              Enter the 3D shop
            </button>
          )}
        </nav>
      </header>
      <main id="main">
        {webglFailed && (
          <p className="notice" role="status">
            The 3D record store couldn't start on this device, so here's the classic version.
          </p>
        )}
        <section>
          <Home />
        </section>
        <section aria-labelledby="featured-h">
          <h2 id="featured-h">Now playing: {featuredProject.title}</h2>
          <ProjectDetail p={featuredProject} />
        </section>
        <section id="projects" aria-labelledby="projects-h">
          <h2 id="projects-h">Projects</h2>
          {categories.map((c) => {
            const list = projects.filter((p) => p.category === c.id)
            if (!list.length) return null
            return (
              <div key={c.id}>
                <h3>
                  {c.title} <span className="muted">· {c.genre}</span>
                </h3>
                {list.map((p) => (
                  <div key={p.id} className="classic-project">
                    <h4>{p.title}</h4>
                    <ProjectDetail p={p} />
                  </div>
                ))}
              </div>
            )
          })}
        </section>
        <section id="experience" aria-labelledby="experience-h">
          <h2 id="experience-h">Experience</h2>
          <Experience />
        </section>
        <section id="about" aria-labelledby="about-h">
          <h2 id="about-h">About</h2>
          <About />
        </section>
        <section id="contact" aria-labelledby="contact-h">
          <h2 id="contact-h">Contact</h2>
          <Contact />
        </section>
      </main>
    </div>
  )
}
