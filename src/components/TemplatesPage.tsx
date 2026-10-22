import { useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Layers3, Sparkles } from 'lucide-react';
import { appConfig } from '../appConfig';
import type { RoadmapTemplate } from '../templates';

interface TemplatesPageProps {
  templates: RoadmapTemplate[];
  initialStartValue: string;
  onUseTemplate: (templateId: string, startValue: string) => void;
}

export function TemplatesPage({ templates, initialStartValue, onUseTemplate }: TemplatesPageProps) {
  const [startValue, setStartValue] = useState(initialStartValue);

  return (
    <main className="templates-page">
      <header className="templates-nav">
        <a className="templates-brand" href="/" aria-label={`${appConfig.branding.name} home`}>
          {appConfig.branding.enabled && (
            <>
              <img src={appConfig.branding.logo} alt="" />
              <span>{appConfig.branding.name}</span>
            </>
          )}
        </a>
        <a className="templates-back-link" href="/">
          <ArrowLeft size={16} />
          Back to overview
        </a>
      </header>

      <section className="templates-content">
        <div className="templates-heading">
          <p className="templates-kicker"><Sparkles size={15} /> Roadmap starter kits</p>
          <h1>Start with a template.<br />Make it yours.</h1>
          <p className="templates-description">
            Choose a proven starting point, then shape the timeline around your goals.
          </p>
          <label className="templates-start-field">
            <CalendarDays size={17} />
            <span>Start month</span>
            <input
              type="month"
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
              aria-label="Template start month"
            />
          </label>
        </div>

        <div className="templates-grid">
          {templates.map((template, index) => (
            <article className="templates-card" key={template.id}>
              <div className={`templates-card-preview templates-card-preview-${index % 3}`} aria-hidden="true">
                <div className="templates-preview-heading">
                  <span>ROADMAP PREVIEW</span>
                  <span>{String(template.monthSpan).padStart(2, '0')} MONTHS</span>
                </div>
                <div className="templates-preview-months">
                  {Array.from({ length: Math.min(template.monthSpan, 6) }, (_, monthIndex) => (
                    <span key={monthIndex}>{`0${monthIndex + 1}`.slice(-2)}</span>
                  ))}
                </div>
                <div className="templates-preview-lanes">
                  {template.lanes.map((lane) => (
                    <div className="templates-preview-lane" key={lane.id}>
                      <span className="templates-preview-lane-name">{lane.name}</span>
                      <span className="templates-preview-track">
                        {template.tasks.filter((task) => task.laneId === lane.id).map((task) => (
                          <span
                            className="templates-preview-task"
                            key={task.title}
                            style={{
                              left: `${Math.min(task.startDay / (template.monthSpan * 30) * 100, 92)}%`,
                              width: `${Math.max(Math.min(task.duration / (template.monthSpan * 30) * 100, 48), 8)}%`,
                              backgroundColor: task.color,
                            }}
                          />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="templates-preview-footer">PLAN · ALIGN · DELIVER</span>
              </div>

              <div className="templates-card-body">
                <p className="templates-card-index">TEMPLATE {String(index + 1).padStart(2, '0')}</p>
                <h2>{template.name}</h2>
                <p className="templates-card-description">{template.subtitle}</p>
                <div className="templates-card-meta">
                  <span><Layers3 size={15} /> {template.lanes.length} lanes</span>
                  <span><CalendarDays size={15} /> {template.monthSpan} months</span>
                </div>
                <ul className="templates-lane-list" aria-label="Template lanes">
                  {template.lanes.map((lane) => <li key={lane.id}>{lane.name}</li>)}
                </ul>
                <button
                  className="templates-use-button"
                  type="button"
                  onClick={() => onUseTemplate(template.id, startValue)}
                >
                  Use this template
                  <ArrowRight size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
