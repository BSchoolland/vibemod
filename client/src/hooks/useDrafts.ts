import { useState, useCallback, useEffect } from 'react';

export interface Draft {
  id: number;
  name: string;
  branch: string;
  path: string;
  adapter_id: string | null;
  adapter_json: string | null;
  is_active: number;
  status: 'inactive' | 'live';
  created_at: string;
  updated_at: string;
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      setDrafts(data.drafts ?? []);
      setActiveDraft(data.active ?? null);
    } catch {
      // server not ready yet
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createDraft = useCallback(async (name?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await fetchAll();
      return data.draft;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAll]);

  const activate = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/drafts/${name}/activate`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await fetchAll();
      return data.draft;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAll]);

  const deleteDraft = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/drafts/${name}`, { method: 'DELETE' });
      await fetchAll();
    } finally {
      setIsLoading(false);
    }
  }, [fetchAll]);

  const rebuild = useCallback(async () => {
    if (!activeDraft) return;
    setIsLoading(true);
    try {
      await fetch(`/api/drafts/${activeDraft.name}/rebuild`, { method: 'POST' });
      await fetchAll();
    } finally {
      setIsLoading(false);
    }
  }, [activeDraft, fetchAll]);

  const publish = useCallback(async (name?: string) => {
    const target = name || activeDraft?.name;
    if (!target) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: target }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await fetchAll();
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [activeDraft, fetchAll]);

  return { drafts, activeDraft, isLoading, createDraft, activate, deleteDraft, rebuild, publish, refetch: fetchAll };
}
