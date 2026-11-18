import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Cloud, FolderOpen, Link2, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteCloudRoadmap, listCloudRoadmaps, saveCloudRoadmap, setCloudRoadmapPublic, type CloudRoadmap } from '../cloudRoadmapStore';
import type { RoadmapState } from '../types';

interface CloudPlansControlsProps {
  roadmap: RoadmapState;
  onLoad: (roadmap: RoadmapState) => void;
}

export function CloudPlansControls({ roadmap, onLoad }: CloudPlansControlsProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [plans, setPlans] = useState<CloudRoadmap[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState(roadmap.title);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [directSaveStatus, setDirectSaveStatus] = useState<'idle' | 'working' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setPlans([]);
        setCurrentPlanId(null);
        setIsOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setPlanName((currentName) => currentPlanId ? currentName : roadmap.title);
  }, [roadmap.title, currentPlanId]);

  useEffect(() => {
    setDirectSaveStatus((currentStatus) => currentStatus === 'saved' ? 'idle' : currentStatus);
  }, [roadmap]);

  async function refreshPlans(activeUser: User) {
    setIsWorking(true);
    setErrorMessage('');
    try {
      setPlans(await listCloudRoadmaps(activeUser));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load plans.');
    } finally {
      setIsWorking(false);
    }
  }

  async function openPlans() {
    setMessage('');
    setErrorMessage('');
    setIsOpen(true);
    if (user) {
      await refreshPlans(user);
    }
  }

  async function savePlan(saveAsNew: boolean, directSave = false) {
    if (!user) {
      setErrorMessage('Sign in before saving a plan.');
      if (directSave) {
        setDirectSaveStatus('error');
      }
      return;
    }

    const name = planName.trim();
    if (!name) {
      setErrorMessage('Enter a plan name.');
      if (directSave) {
        setDirectSaveStatus('error');
      }
      return;
    }

    setIsWorking(true);
    if (directSave) {
      setDirectSaveStatus('working');
    }
    setErrorMessage('');
    setMessage('');
    try {
      const saved = await saveCloudRoadmap(user, saveAsNew ? null : currentPlanId, name, roadmap);
      setCurrentPlanId(saved.id);
      setPlanName(saved.title);
      setMessage(saveAsNew ? 'Saved as a new plan.' : 'Plan saved.');
      if (directSave) {
        setDirectSaveStatus('saved');
      }
      await refreshPlans(user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save plan.');
      if (directSave) {
        setDirectSaveStatus('error');
      }
    } finally {
      setIsWorking(false);
    }
  }

  function loadPlan(plan: CloudRoadmap) {
    onLoad(plan.payload);
    setCurrentPlanId(plan.id);
    setPlanName(plan.title);
    setMessage(`Loaded "${plan.title}".`);
  }

  async function togglePublicPlan(plan: CloudRoadmap) {
    if (!user) {
      return;
    }

    setIsWorking(true);
    setErrorMessage('');
    setMessage('');
    try {
      const shareToken = await setCloudRoadmapPublic(user, plan.id, !plan.isPublic);
      setPlans((currentPlans) => currentPlans.map((currentPlan) => (
        currentPlan.id === plan.id
          ? { ...currentPlan, isPublic: !plan.isPublic, shareToken }
          : currentPlan
      )));

      if (shareToken) {
        const url = `${window.location.origin}${window.location.pathname}#shared=${shareToken}`;
        await navigator.clipboard?.writeText(url);
        setMessage('Public link created and copied.');
      } else {
        setMessage('Public sharing stopped.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update sharing.');
    } finally {
      setIsWorking(false);
    }
  }

  async function removePlan(planId: string) {
    if (!user) {
      return;
    }

    setIsWorking(true);
    setErrorMessage('');
    try {
      await deleteCloudRoadmap(user, planId);
      setPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== planId));
      if (currentPlanId === planId) {
        setCurrentPlanId(null);
      }
      setMessage('Plan deleted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete plan.');
    } finally {
      setIsWorking(false);
    }
  }

  if (!supabase) {
    return null;
  }

  return (
    <>
      <button type="button" className="cloud-plans-save" onClick={() => savePlan(false, true)} disabled={!user || isWorking}>
        <Cloud size={16} />
        <span>{directSaveStatus === 'working' ? 'Saving...' : directSaveStatus === 'saved' ? 'Saved to Cloud' : directSaveStatus === 'error' ? 'Save failed' : 'Save on Cloud'}</span>
      </button>
      <button type="button" className="planner-nav-action cloud-plans-trigger" onClick={openPlans} disabled={!user}>
        <Cloud size={16} />
        <span>{currentPlanId ? 'Plan saved' : 'Cloud plans'}</span>
      </button>

      {isOpen && (
        <div className="cloud-plans-overlay" role="presentation" onClick={() => setIsOpen(false)}>
          <section className="cloud-plans-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-plans-title" onClick={(event) => event.stopPropagation()}>
            <header className="cloud-plans-header">
              <div>
                <p className="cloud-plans-kicker">Supabase</p>
                <h2 id="cloud-plans-title">Cloud plans</h2>
              </div>
              <button type="button" className="auth-close" onClick={() => setIsOpen(false)} aria-label="Close cloud plans"><X size={20} /></button>
            </header>

            {!user ? (
              <p className="cloud-plans-empty">Sign in to save and load plans.</p>
            ) : (
              <>
                <label className="cloud-plan-name">
                  <span>Plan name</span>
                  <input value={planName} onChange={(event) => setPlanName(event.target.value)} />
                </label>

                <div className="cloud-plan-actions">
                  <button type="button" className="cloud-plan-primary" onClick={() => savePlan(false)} disabled={isWorking}><Cloud size={16} />{isWorking ? 'Working...' : 'Save plan'}</button>
                  <button type="button" className="cloud-plan-secondary" onClick={() => savePlan(true)} disabled={isWorking}><Plus size={16} />Save as new</button>
                </div>

                {errorMessage && <p className="cloud-plan-error" role="alert">{errorMessage}</p>}
                {message && <p className="cloud-plan-status" role="status">{message}</p>}

                <div className="cloud-plan-list-heading">
                  <span>Your plans</span>
                  {isWorking && <small>Loading...</small>}
                </div>

                {plans.length === 0 && !isWorking ? (
                  <p className="cloud-plans-empty">No cloud plans yet.</p>
                ) : (
                  <div className="cloud-plan-list">
                    {plans.map((plan) => (
                      <article className={`cloud-plan-item${currentPlanId === plan.id ? ' active' : ''}`} key={plan.id}>
                        <button type="button" className="cloud-plan-load" onClick={() => loadPlan(plan)}>
                          <FolderOpen size={17} />
                          <span>
                            <strong>{plan.title}</strong>
                            <small>Updated {new Date(plan.updatedAt).toLocaleString()}</small>
                          </span>
                        </button>
                        <button type="button" className="cloud-plan-share" onClick={() => togglePublicPlan(plan)} disabled={isWorking} aria-label={plan.isPublic ? `Stop sharing ${plan.title}` : `Share ${plan.title}`} title={plan.isPublic ? 'Stop public sharing' : 'Create public link'}><Link2 size={16} /></button>
                        <button type="button" className="cloud-plan-delete" onClick={() => removePlan(plan.id)} disabled={isWorking} aria-label={`Delete ${plan.title}`}><Trash2 size={16} /></button>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
