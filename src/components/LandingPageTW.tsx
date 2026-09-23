import {
  ArrowRight,
  BarChart3,
  Check,
  Clock3,
  Columns3,
  LayoutTemplate,
  Play,
  Printer,
  ShieldCheck,
  SquareMousePointer,
} from 'lucide-react';
import { appConfig } from '../appConfig';

interface LandingPageTWProps {
  onOpenPlanner: () => void;
}

export function LandingPageTW({ onOpenPlanner }: LandingPageTWProps) {
  const features = [
    {
      icon: BarChart3,
      title: 'See the whole plan',
      description: 'Switch between month, week and day views without losing context.',
    },
    {
      icon: SquareMousePointer,
      title: 'Move faster with less friction',
      description: 'Drag tasks across the timeline and resize them naturally.',
    },
    {
      icon: ShieldCheck,
      title: 'Built for privacy',
      description: 'Your roadmap lives locally in the browser, so the plan stays under your control.',
    },
    {
      icon: LayoutTemplate,
      title: 'Start from a strong template',
      description: 'Start with a proven structure and tailor the plan to your priorities without rebuilding from scratch.',
    },
    {
      icon: Columns3,
      title: 'Organize by swimlane',
      description: 'Group work by team, initiative, or goal so the roadmap stays easy to scan and easy to share.',
    },
    {
      icon: Printer,
      title: 'Ready for print and sharing',
      description: 'Keep a polished, presentation-ready plan for updates, reviews, and stakeholder conversations.',
    },
  ];

  const stats = [
    { value: '1', label: 'Browser. No setup required' },
    { value: '100%', label: 'Private by default' },
    { value: '4x', label: 'Faster planning loops' },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] bg-white bg-[radial-gradient(#bfdbfe_1px,transparent_1px)] [background-size:16px_16px]
        bg-[size:24px_24px] text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-[42rem]" />

      <header className="sticky top-0 z-10 border-b border-slate-200 bg-[#ffffff]/90 px-6 py-4 backdrop-blur-sm lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-sm font-bold text-slate-900">
              {appConfig.branding.enabled && <div className="brand-lockup">
                <img className="brand-logo" src={appConfig.branding.logo} alt={`${appConfig.branding.name} logo`} />
                <span>{appConfig.branding.name}</span>
              </div>}
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#product" className="transition hover:text-slate-900">Product</a>
            <a href="#features" className="transition hover:text-slate-900">Features</a>
          </div>

          <button
            type="button"
            onClick={onOpenPlanner}
            className="inline-flex items-center gap-2 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open planner
            <ArrowRight className="h-4 w-4" />
          </button>
        </nav>
      </header>

      <main className="mx-auto">
        <section className="px-6 py-12 lg:px-8 lg:py-16">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Stop dragging boxes in PowerPoint. Build clear roadmaps in minutes.
              </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Use templates to start with a clear structure, then drag and resize tasks to shape the plan as priorities change.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenPlanner}
                className="inline-flex items-center gap-2 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start planning
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* <button
                type="button"
                className="inline-flex items-center gap-2 border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Play className="h-4 w-4" />
                See how it works
              </button> */}
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-left">
              {stats.map((stat) => (
                <div key={stat.label} className="border border-slate-200 bg-white p-4">
                  <div className="text-xl font-semibold text-slate-900">{stat.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
            </div>

            <div id="product" className="relative">
            <div className="absolute -inset-8 bg-[radial-gradient(circle,_rgba(16,185,129,0.16),_transparent_55%)] blur-3xl" />
            <div className="relative overflow-hidden border border-slate-200 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="border border-slate-200 bg-[#f8f7f4] p-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">Q2 planning cycle</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">Roadmap</h2>
                  </div>
                  <div className="border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
                    Apr – Jun
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-[90px_1fr] gap-4">
                  <div className="space-y-5 pt-7 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    <div>Product</div>
                    <div>Content</div>
                    <div>Security</div>
                  </div>

                  <div className="relative overflow-hidden border border-slate-200 bg-white p-3">
                    <div className="mb-4 flex justify-between text-[9px] font-medium uppercase tracking-[0.18em] text-slate-400">
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                    </div>

                    <div className="relative h-28">
                      <div className="absolute inset-0 grid grid-cols-3 gap-2">
                        {[...Array(6)].map((_, index) => (
                          <div key={index} className="border-l border-slate-200" />
                        ))}
                      </div>

                      <div className="absolute left-3 top-5 flex h-8 w-32 items-center gap-2 bg-emerald-50 px-2 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                        <span className="h-2 w-2 bg-emerald-500" />
                        Foundation
                      </div>

                      <div className="absolute left-16 top-14 flex h-8 w-28 items-center gap-2 bg-violet-50 px-2 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                        <span className="h-2 w-2 bg-violet-500" />
                        Launch story
                      </div>

                      <div className="absolute left-24 top-24 flex h-8 w-28 items-center gap-2 bg-cyan-50 px-2 text-xs font-medium text-cyan-700 ring-1 ring-inset ring-cyan-200">
                        <span className="h-2 w-2 bg-cyan-500" />
                        Risk review
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-3.5 w-3.5" />
                    Autosaved locally
                  </span>
                  <span>Drag to shape the plan</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-slate-200 bg-[#ffffff] px-6 py-12 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Built for better planning</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Everything your roadmap needs, without the overhead.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="border border-slate-200 bg-white p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center bg-white text-slate-900 ring-1 ring-inset ring-slate-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>        

        <section className="border-t border-slate-200 px-6 py-12 text-center lg:px-8 lg:py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Start with the plan you have</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              A roadmap that stays clear to present and print.
            </h2>
            <button
              type="button"
              onClick={onOpenPlanner}
              className="mt-8 inline-flex items-center gap-2 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open the planner
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-500 lg:px-8">
        <p>© {new Date().getFullYear()} {appConfig.branding.name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
