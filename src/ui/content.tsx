import {
  about,
  contact,
  experience,
  getCategory,
  getProject,
  owner,
  projects,
  type InteractionTarget,
  type Project,
  type SectionId,
} from '../data/portfolio'
import { openPanel } from '../state/store'

/**
 * Portfolio content renderers. Shared by the in-scene panel and the classic
 * (non-3D) layout so both always show the same information.
 */

export const SECTION_TITLES: Record<SectionId, string> = {
  home: owner.name,
  projects: 'Projects',
  experience: 'Experience',
  about: 'About',
  contact: 'Contact',
}

export function titleFor(t: InteractionTarget): string {
  switch (t.kind) {
    case 'section':
      return SECTION_TITLES[t.section]
    case 'project':
      return getProject(t.projectId)?.title ?? 'Project'
    case 'category':
      return getCategory(t.categoryId).title
    case 'link':
      return t.url
  }
}

function ProjectCard({ p, onOpen }: { p: Project; onOpen?: (p: Project) => void }) {
  return (
    <li className="card">
      <div className="card-swatch" style={{ background: `linear-gradient(135deg, ${p.cover.palette[0]}, ${p.cover.palette[2]})` }} aria-hidden />
      <div>
        <h4>{onOpen ? <button className="linklike" onClick={() => onOpen(p)}>{p.title}</button> : p.title}</h4>
        <p className="muted">
          {getCategory(p.category).title} · {p.year}
        </p>
        <p>{p.summary}</p>
      </div>
    </li>
  )
}

export function ProjectList({ list, inPanel }: { list: Project[]; inPanel?: boolean }) {
  const open = inPanel ? (p: Project) => openPanel({ kind: 'project', projectId: p.id }) : undefined
  return (
    <ul className="cards">
      {list.map((p) => (
        <ProjectCard key={p.id} p={p} onOpen={open} />
      ))}
    </ul>
  )
}

export function ProjectDetail({ p }: { p: Project }) {
  return (
    <article className="project">
      <p className="eyebrow">
        {getCategory(p.category).genre} · {getCategory(p.category).title} · {p.year}
      </p>
      <p className="lead">{p.summary}</p>
      {p.description.map((d, i) => (
        <p key={i}>{d}</p>
      ))}
      {p.images?.map((img) => <img key={img.src} src={img.src} alt={img.alt} loading="lazy" />)}
      <h4>Technologies</h4>
      <ul className="tags">
        {p.technologies.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {(p.github || p.demo) && (
        <p className="actions">
          {p.github && (
            <a className="btn" href={p.github} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          )}
          {p.demo && (
            <a className="btn" href={p.demo} target="_blank" rel="noreferrer">
              Live demo
            </a>
          )}
        </p>
      )}
    </article>
  )
}

export function Home() {
  return (
    <div>
      <p className="eyebrow">{owner.discipline}</p>
      <p className="lead">{owner.intro}</p>
    </div>
  )
}

export function About() {
  return (
    <div>
      {about.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <h4>Education</h4>
      <ul>
        {about.education.map((e) => (
          <li key={e.title}>
            <strong>{e.title}</strong> <span className="muted">{e.detail}</span>
          </li>
        ))}
      </ul>
      <h4>Interests</h4>
      <ul className="tags">
        {about.interests.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <h4>Goals</h4>
      <p>{about.goals}</p>
    </div>
  )
}

const KIND_LABEL = { work: 'Work', leadership: 'Leadership', volunteering: 'Volunteering', award: 'Award' }

export function Experience() {
  return (
    <ol className="timeline">
      {experience.map((e) => (
        <li key={e.role + e.period}>
          <p className="eyebrow">
            {KIND_LABEL[e.kind]} · {e.period}
          </p>
          <h4>
            {e.role} <span className="muted">· {e.organisation}</span>
          </h4>
          <ul>
            {e.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

export function Contact() {
  return (
    <div>
      <p className="lead">The turntable's always on. Drop me a line:</p>
      <p>
        <a className="btn" href={`mailto:${contact.email}`}>
          {contact.email}
        </a>
      </p>
      <ul className="links">
        {contact.links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Body of the panel for any interaction target. */
export function TargetContent({ target }: { target: InteractionTarget }) {
  switch (target.kind) {
    case 'section':
      switch (target.section) {
        case 'home':
          return (
            <>
              <Home />
              <h4>Start browsing</h4>
              <ProjectList list={projects.filter((p) => p.featured)} inPanel />
            </>
          )
        case 'projects':
          return <ProjectList list={projects} inPanel />
        case 'experience':
          return <Experience />
        case 'about':
          return <About />
        case 'contact':
          return <Contact />
      }
      break
    case 'project': {
      const p = getProject(target.projectId)
      return p ? <ProjectDetail p={p} /> : <p>Project not found.</p>
    }
    case 'category': {
      const c = getCategory(target.categoryId)
      const list = projects.filter((p) => p.category === c.id)
      return (
        <>
          <p className="eyebrow">Filed under {c.genre}</p>
          <p className="lead">{c.description}</p>
          {list.length ? <ProjectList list={list} inPanel /> : <p className="muted">Nothing in this bin yet.</p>}
        </>
      )
    }
    case 'link':
      return null
  }
  return null
}
