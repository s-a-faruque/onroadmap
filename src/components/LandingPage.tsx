import { ArrowRight, CalendarDays, FileDown, GripVertical, Palette, Save, SlidersHorizontal } from 'lucide-react';

interface LandingPageProps {
  onOpenPlanner: () => void;
}

export function LandingPage({ onOpenPlanner }: LandingPageProps) {
  const features = [
    {
      icon: CalendarDays,
      title: 'See the whole year',
      description: 'Switch between a spacious month view and a precise week view without losing the shape of the plan.',
    },
    {
      icon: GripVertical,
      title: 'Shape work directly',
      description: 'Drag work across dates and swimlanes, then resize the edges when the plan changes.',
    },
    {
      icon: SlidersHorizontal,
      title: 'Stay aligned',
      description: 'Snap movement to days, weeks, or months so planning stays fast and dates stay intentional.',
    },
    {
      icon: Palette,
      title: 'Make priorities legible',
      description: 'Edit roadmap titles, lane names, task names, and task colors right where the work lives.',
    },
    {
      icon: Save,
      title: 'Keep changes close',
      description: 'Your roadmap autosaves locally, so the latest plan is ready when you return to it.',
    },
    {
      icon: FileDown,
      title: 'Share the finished plan',
      description: 'Download a print-ready PDF with a visible timeline border, or export JSON for backup and handoff.',
    },
  ];

  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Landing page navigation">
        <div className="brand-lockup">
          <img className="brand-logo" src="/route.png" alt="Onroadmap logo" />
          <span>onroadmap</span>
        </div>
        <button className="landing-nav-action" type="button" onClick={onOpenPlanner}>
          Open planner <ArrowRight size={16} />
        </button>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="landing-kicker">A clearer way to plan the year</p>
          <h1>Make the work visible.</h1>
          <p className="hero-description">
            Onroadmap turns shifting projects into one calm, editable view your team can understand at a glance.
          </p>
          <button className="hero-action" type="button" onClick={onOpenPlanner}>
            Start planning <ArrowRight size={18} />
          </button>
          <p className="hero-note">Built for thoughtful plans, fast changes, and clean handoffs.</p>
        </div>

        <div className="preview-stage" aria-label="Roadmap preview">
          <div className="preview-header">
            <div>
              <span className="preview-overline">Q2 planning cycle</span>
              <strong>Roadmap</strong>
            </div>
            <span className="preview-date">APR - JUN 2026</span>
          </div>
          <div className="preview-grid">
            <div className="preview-labels">
              <span>PRODUCT</span>
              <span>CONTENT</span>
              <span>SECURITY</span>
            </div>
            <div className="preview-track">
              <div className="preview-months"><span>APR</span><span>MAY</span><span>JUN</span></div>
              <div className="preview-lines"><i /><i /><i /><i /><i /><i /></div>
              <div className="preview-task task-one"><b />Foundation</div>
              <div className="preview-task task-two"><b />Launch story</div>
              <div className="preview-task task-three"><b />Risk review</div>
            </div>
          </div>
          <div className="preview-footer"><span><Save size={13} /> Autosaved locally</span><span>Drag to shape the plan</span></div>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="feature-heading">
        <div className="section-intro">
          <p className="landing-kicker">One surface, fewer loose ends</p>
          <h2 id="feature-heading">Everything your roadmap needs.</h2>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="feature-item" key={title}>
              <span className="feature-icon"><Icon size={19} strokeWidth={1.8} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <p className="landing-kicker">Your next clear view</p>
          <h2>Start with the plan you have.</h2>
        </div>
        <button className="hero-action" type="button" onClick={onOpenPlanner}>
          Open the planner <ArrowRight size={18} />
        </button>
      </section>

      <footer className="landing-footer"><span>onroadmap</span><span>Plan clearly. Move deliberately.</span></footer>
    </main>
  );
}