import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { RoadmapState } from './types';

export interface CloudRoadmap {
  id: string;
  title: string;
  payload: RoadmapState;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  shareToken: string | null;
}

export async function listCloudRoadmaps(user: User): Promise<CloudRoadmap[]> {
  if (!supabase) {
    throw new Error('Supabase sign-in is not configured.');
  }

  const { data, error } = await supabase
    .from('roadmaps')
    .select('id, title, payload, is_public, share_token, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    payload: row.payload as RoadmapState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPublic: row.is_public,
    shareToken: row.share_token,
  }));
}

export async function saveCloudRoadmap(
  user: User,
  planId: string | null,
  title: string,
  payload: RoadmapState,
): Promise<CloudRoadmap> {
  if (!supabase) {
    throw new Error('Supabase sign-in is not configured.');
  }

  const values = {
    user_id: user.id,
    title,
    payload,
  };

  const query = planId
    ? supabase.from('roadmaps').update(values).eq('id', planId).eq('user_id', user.id).select('id, title, payload, is_public, share_token, created_at, updated_at').single()
    : supabase.from('roadmaps').insert(values).select('id, title, payload, is_public, share_token, created_at, updated_at').single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    payload: data.payload as RoadmapState,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPublic: data.is_public,
    shareToken: data.share_token,
  };
}

export async function setCloudRoadmapPublic(
  user: User,
  planId: string,
  isPublic: boolean,
): Promise<string | null> {
  if (!supabase) {
    throw new Error('Supabase sign-in is not configured.');
  }

  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const shareToken = isPublic
    ? Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    : null;

  const { data, error } = await supabase
    .from('roadmaps')
    .update({ is_public: isPublic, share_token: isPublic ? shareToken : null })
    .eq('id', planId)
    .eq('user_id', user.id)
    .select('share_token')
    .single();

  if (error) {
    throw error;
  }

  return data.share_token as string | null;
}

export async function loadPublicRoadmap(shareToken: string): Promise<CloudRoadmap> {
  if (!supabase) {
    throw new Error('Supabase sign-in is not configured.');
  }

  const { data, error } = await supabase
    .from('roadmaps')
    .select('id, title, payload, is_public, share_token, created_at, updated_at')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('This shared plan is unavailable or has been unshared.');
  }

  return {
    id: data.id,
    title: data.title,
    payload: data.payload as RoadmapState,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    isPublic: data.is_public,
    shareToken: data.share_token,
  };
}

export async function deleteCloudRoadmap(user: User, planId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase sign-in is not configured.');
  }

  const { error } = await supabase
    .from('roadmaps')
    .delete()
    .eq('id', planId)
    .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}
