/**
 * Portfolio content.
 *
 * This file is the single source of truth for everything the visitor reads.
 * The 3D scene never contains portfolio text directly: interactive objects only
 * carry an `interactId`, and `interactions` (bottom of this file) maps each id
 * to a section, project, category or external link.
 *
 * Replace the placeholder values below with your own details. Anything marked
 * EXAMPLE is sample content that should be rewritten or removed.
 */

export type SectionId = 'home' | 'projects' | 'experience' | 'about' | 'contact'

export type CategoryId = 'systems' | 'hardware' | 'experimental' | 'interdisciplinary'

export interface Link {
  label: string
  url: string
}

/** Drives the procedurally generated album sleeve for a project. */
export interface CoverStyle {
  /** Background, primary and accent colours. */
  palette: [string, string, string]
  pattern: 'rings' | 'stripes' | 'grid' | 'wave' | 'sun' | 'noise'
}

export interface Project {
  id: string
  title: string
  /** Shown like an album subtitle on the sleeve. */
  tagline: string
  category: CategoryId
  year: string
  summary: string
  /** Paragraphs for the detail panel. */
  description: string[]
  technologies: string[]
  /** Optional images, relative to /public (e.g. "images/project.jpg"). */
  images?: { src: string; alt: string }[]
  github?: string
  demo?: string
  cover: CoverStyle
  featured?: boolean
}

export interface Category {
  id: CategoryId
  /** The genre label printed on the record-bin divider. */
  genre: string
  title: string
  description: string
}

export interface ExperienceEntry {
  kind: 'work' | 'leadership' | 'volunteering' | 'award'
  role: string
  organisation: string
  period: string
  points: string[]
}

export const owner = {
  name: 'Tibelson',
  discipline: 'Software & Hardware Engineer',
  intro:
    'Welcome to Vinyl Ecstatic, my portfolio in the shape of a record store. Every record on the wall is a project, the genre bins sort them by discipline, and the counter, turntable and signs hold the rest. Have a browse.',
  location: 'Planet Earth',
}

export const about = {
  paragraphs: [
    'EXAMPLE: I am an engineer who likes working across the stack, from bare-metal firmware to the web interfaces that sit on top of it.',
    'EXAMPLE: Outside of engineering I collect records, take things apart to see how they work and occasionally put them back together.',
  ],
  education: [{ title: 'EXAMPLE: B.Eng. Electronic & Computer Engineering', detail: 'University name · 20XX – 20XX' }],
  interests: ['Systems programming', 'Embedded hardware', 'Networking', 'Audio', 'Record collecting'],
  goals:
    'EXAMPLE: Looking for roles where low-level engineering meets thoughtful product design.',
}

export const contact = {
  email: 'you@example.com',
  links: [
    { label: 'GitHub', url: 'https://github.com/tibelson' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ] as Link[],
}

export const categories: Category[] = [
  {
    id: 'systems',
    genre: 'GRUNGE',
    title: 'Systems programming',
    description: 'Low-level development: operating systems, compilers, runtimes and anything close to the metal.',
  },
  {
    id: 'hardware',
    genre: 'INDIE ROCK',
    title: 'Hardware & embedded',
    description: 'Circuit design, firmware and embedded systems.',
  },
  {
    id: 'experimental',
    genre: 'ALTERNATIVE',
    title: 'Experiments & research',
    description: 'Prototypes, research projects and ideas that did not fit anywhere else.',
  },
  {
    id: 'interdisciplinary',
    genre: 'POST-PUNK',
    title: 'Interdisciplinary work',
    description: 'Networking, tooling and work that crosses engineering disciplines.',
  },
]

export const projects: Project[] = [
  {
    id: 'vinyl-ecstatic',
    title: 'Vinyl Ecstatic',
    tagline: 'A walkable 3D portfolio',
    category: 'experimental',
    year: '2026',
    summary: 'This website: a first-person record store built with React Three Fiber.',
    description: [
      'A fully navigable 3D record store that doubles as a portfolio. Visitors walk the aisles with WASD or touch controls and open projects by looking at records.',
      'All geometry is procedural and modular, textures are generated at runtime, repeated records are GPU-instanced and the whole site falls back to a conventional layout when WebGL is unavailable.',
    ],
    technologies: ['TypeScript', 'React', 'Three.js', 'React Three Fiber', 'Vite'],
    github: 'https://github.com/tibelson/tibelson.github.io',
    cover: { palette: ['#1d1a2f', '#f0a640', '#e4572e'], pattern: 'sun' },
    featured: true,
  },
  {
    id: 'tiny-kernel',
    title: 'Tiny Kernel',
    tagline: 'EXAMPLE · a hobby OS',
    category: 'systems',
    year: '2025',
    summary: 'EXAMPLE: A small x86-64 kernel with paging, a scheduler and a FAT driver.',
    description: [
      'EXAMPLE: Replace this with a real project description: what problem it solves, what you built and what you learned.',
    ],
    technologies: ['C', 'x86-64 assembly', 'QEMU'],
    github: 'https://github.com/tibelson',
    cover: { palette: ['#0f0f10', '#d9d4c7', '#b23a2b'], pattern: 'rings' },
  },
  {
    id: 'rust-allocator',
    title: 'Slab Sessions',
    tagline: 'EXAMPLE · memory allocator',
    category: 'systems',
    year: '2024',
    summary: 'EXAMPLE: A lock-free slab allocator benchmarked against jemalloc.',
    description: ['EXAMPLE: Describe your project here.'],
    technologies: ['Rust', 'Criterion'],
    cover: { palette: ['#e8dcc4', '#2b2b2b', '#c8553d'], pattern: 'grid' },
  },
  {
    id: 'synth-board',
    title: 'Analog Hearts',
    tagline: 'EXAMPLE · synth PCB',
    category: 'hardware',
    year: '2025',
    summary: 'EXAMPLE: A four-voice analogue synthesiser on a custom four-layer PCB.',
    description: ['EXAMPLE: Describe your project here.'],
    technologies: ['KiCad', 'STM32', 'C'],
    cover: { palette: ['#2a4d3e', '#f2e8cf', '#e9a23b'], pattern: 'wave' },
  },
  {
    id: 'weather-node',
    title: 'Low Power Weather',
    tagline: 'EXAMPLE · LoRa sensor node',
    category: 'hardware',
    year: '2023',
    summary: 'EXAMPLE: A solar powered LoRa weather station running for months on one cell.',
    description: ['EXAMPLE: Describe your project here.'],
    technologies: ['ESP32', 'LoRaWAN', 'Zephyr'],
    cover: { palette: ['#a9c5d3', '#1b2a41', '#f4f1de'], pattern: 'stripes' },
  },
  {
    id: 'mesh-router',
    title: 'Packet Loss',
    tagline: 'EXAMPLE · mesh networking',
    category: 'interdisciplinary',
    year: '2024',
    summary: 'EXAMPLE: A self-healing mesh network for community Wi-Fi.',
    description: ['EXAMPLE: Describe your project here.'],
    technologies: ['Go', 'OpenWrt', 'BATMAN-adv'],
    cover: { palette: ['#3b1f2b', '#f7b267', '#f25c54'], pattern: 'noise' },
  },
  {
    id: 'audio-ml',
    title: 'Neural Grooves',
    tagline: 'EXAMPLE · ML research',
    category: 'experimental',
    year: '2025',
    summary: 'EXAMPLE: Classifying record wear from audio with a small CNN.',
    description: ['EXAMPLE: Describe your project here.'],
    technologies: ['Python', 'PyTorch', 'librosa'],
    cover: { palette: ['#f4e9d8', '#283d3b', '#c44536'], pattern: 'rings' },
  },
]

export const experience: ExperienceEntry[] = [
  {
    kind: 'work',
    role: 'EXAMPLE: Software Engineering Intern',
    organisation: 'Company name',
    period: 'Summer 20XX',
    points: ['EXAMPLE: What you built and the impact it had.'],
  },
  {
    kind: 'leadership',
    role: 'EXAMPLE: President, Robotics Society',
    organisation: 'University name',
    period: '20XX – 20XX',
    points: ['EXAMPLE: What you led.'],
  },
  {
    kind: 'volunteering',
    role: 'EXAMPLE: Code club mentor',
    organisation: 'Local library',
    period: '20XX – present',
    points: ['EXAMPLE: Who you helped.'],
  },
  {
    kind: 'award',
    role: 'EXAMPLE: Hackathon winner',
    organisation: 'Event name',
    period: '20XX',
    points: ['EXAMPLE: What you won it for.'],
  },
]

export const featuredProject: Project = projects.find((p) => p.featured) ?? projects[0]

export const getProject = (id: string) => projects.find((p) => p.id === id)
export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!

/* ------------------------------------------------------------------------ */
/* Interaction map: 3D interactId -> what opens                             */
/* ------------------------------------------------------------------------ */

export type InteractionTarget =
  | { kind: 'section'; section: SectionId }
  | { kind: 'project'; projectId: string }
  | { kind: 'category'; categoryId: CategoryId }
  | { kind: 'link'; url: string }

export interface Interaction {
  /** Short prompt shown next to the crosshair: "Press E to <verb>". */
  verb: string
  target: InteractionTarget
}

const projectInteractions = Object.fromEntries(
  projects.map((p) => [`record:${p.id}`, { verb: `pull out "${p.title}"`, target: { kind: 'project', projectId: p.id } }]),
) as Record<string, Interaction>

const categoryInteractions = Object.fromEntries(
  categories.map((c) => [`genre:${c.id}`, { verb: `browse ${c.genre} (${c.title})`, target: { kind: 'category', categoryId: c.id } }]),
) as Record<string, Interaction>

export const interactions: Record<string, Interaction> = {
  'sign:main': { verb: 'read the intro', target: { kind: 'section', section: 'home' } },
  'sign:support-indie': { verb: 'read about me', target: { kind: 'section', section: 'about' } },
  'counter:register': { verb: 'view experience', target: { kind: 'section', section: 'experience' } },
  'display:now-playing': { verb: `see the featured project`, target: { kind: 'project', projectId: featuredProject.id } },
  'turntable:contact': { verb: 'get in touch', target: { kind: 'section', section: 'contact' } },
  'shelf:projects': { verb: 'browse all projects', target: { kind: 'section', section: 'projects' } },
  ...projectInteractions,
  ...categoryInteractions,
}
