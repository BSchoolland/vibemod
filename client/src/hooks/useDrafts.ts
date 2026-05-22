import { useState, useCallback } from 'react';

export interface Draft {
  name: string;
  branch: string;
  path: string;
}

export function useDrafts() {
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setActiveDraft(data.draft);
      return data.draft;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDraft = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/drafts/${name}`, { method: 'DELETE' });
      setActiveDraft(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rebuild = useCallback(async () => {
    if (!activeDraft) return;
    setIsLoading(true);
    try {
      await fetch(`/api/drafts/${activeDraft.name}/rebuild`, { method: 'POST' });
    } finally {
      setIsLoading(false);
    }
  }, [activeDraft]);

  const publish = useCallback(async () => {
    if (!activeDraft) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/publish', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setActiveDraft(null);
      return data;
    } finally {
      setIsLoading(false);
    }
  }, [activeDraft]);

  return { activeDraft, isLoading, createDraft, deleteDraft, rebuild, publish };
}
