'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client-utils';

interface CachedRecipe {
  slug: string;
  title: string;
  url: string;
  excerpt: string | null;
}

type Tab = 'catalog' | 'manual';

export default function DropRecipePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('catalog');
  const [recipes, setRecipes] = useState<CachedRecipe[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manual tab state
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  // Selected recipe
  const [selectedRecipe, setSelectedRecipe] = useState<CachedRecipe | null>(null);

  const loadRecipes = async (searchTerm = '') => {
    setLoading(true);
    try {
      const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const data = await api<CachedRecipe[]>(`/recipes/cache${params}`);
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const refreshCache = async () => {
    setRefreshing(true);
    setError('');
    try {
      const result = await api<{ updated: number }>('/recipes/cache', { method: 'POST' });
      setSuccess(`Refreshed ${result.updated} recipes from catalog`);
      await loadRecipes(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh cache');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecipes(search);
  };

  const handleDrop = async () => {
    setDropping(true);
    setError('');
    setSuccess('');

    try {
      if (tab === 'catalog' && selectedRecipe) {
        await api('/admin/drop-recipe', {
          method: 'POST',
          body: JSON.stringify({ recipe_slug: selectedRecipe.slug }),
        });
        setSuccess(`Dropped: ${selectedRecipe.title}`);
        setSelectedRecipe(null);
      } else if (tab === 'manual' && manualTitle) {
        await api('/admin/drop-recipe', {
          method: 'POST',
          body: JSON.stringify({
            custom_title: manualTitle,
            custom_url: manualUrl || undefined,
          }),
        });
        setSuccess(`Dropped: ${manualTitle}`);
        setManualTitle('');
        setManualUrl('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to drop recipe');
    } finally {
      setDropping(false);
    }
  };

  return (
    <main className="container">
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Drop Recipe</h1>
        <p className="page-subtitle">Share a recipe with the club</p>
      </header>

      {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ color: 'var(--color-success)', marginBottom: '16px' }}>{success}</div>}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          className={`btn ${tab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('catalog')}
        >
          From Catalog
        </button>
        <button
          className={`btn ${tab === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('manual')}
        >
          Manual
        </button>
      </div>

      {tab === 'catalog' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes..."
              />
              <button type="submit" className="btn btn-secondary" disabled={loading}>
                Search
              </button>
            </form>
            <button
              className="btn btn-secondary"
              onClick={refreshCache}
              disabled={refreshing}
            >
              {refreshing ? '...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="empty-state">Loading...</div>
          ) : recipes.length === 0 ? (
            <div className="empty-state">
              <p>No recipes in cache</p>
              <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
                Click Refresh to load from catalog
              </p>
            </div>
          ) : (
            <div>
              {recipes.map((recipe) => (
                <button
                  key={recipe.slug}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="card"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: selectedRecipe?.slug === recipe.slug ? 'var(--color-accent)' : undefined,
                  }}
                >
                  <div className="card-title">{recipe.title}</div>
                  {recipe.excerpt && (
                    <div className="card-meta" style={{ marginTop: '4px' }}>
                      {recipe.excerpt}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedRecipe && (
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-accent-muted)', borderRadius: '12px' }}>
              <p style={{ marginBottom: '12px' }}>
                <strong>Selected:</strong> {selectedRecipe.title}
              </p>
              <button
                className="btn btn-primary"
                onClick={handleDrop}
                disabled={dropping}
              >
                {dropping ? 'Dropping...' : 'Drop Recipe'}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'manual' && (
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="title">Recipe Title</label>
            <input
              id="title"
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Enter recipe title"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="url">Recipe URL (optional)</label>
            <input
              id="url"
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={handleDrop}
            disabled={dropping || !manualTitle.trim()}
          >
            {dropping ? 'Dropping...' : 'Drop Recipe'}
          </button>
        </div>
      )}
    </main>
  );
}
