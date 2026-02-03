import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface CachedRecipe {
  slug: string;
  title: string;
  url: string;
}

type Tab = 'catalog' | 'manual';

export default function DropRecipe() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [search, setSearch] = useState('');
  const [recipes, setRecipes] = useState<CachedRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<CachedRecipe | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [dropping, setDropping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  const searchRecipes = async () => {
    try {
      const data = await api<CachedRecipe[]>(`/api/recipes/cache?search=${encodeURIComponent(search)}`);
      setRecipes(data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const refreshCache = async () => {
    setRefreshing(true);
    try {
      await api('/api/recipes/cache', { method: 'POST' });
      setMessage('Cache refreshed!');
      if (search) {
        await searchRecipes();
      }
    } catch (error) {
      setMessage('Failed to refresh cache');
    } finally {
      setRefreshing(false);
    }
  };

  const handleDrop = async () => {
    setDropping(true);
    setMessage('');
    try {
      if (tab === 'catalog' && selectedRecipe) {
        await api('/api/admin/drop-recipe', {
          method: 'POST',
          body: JSON.stringify({
            recipe_slug: selectedRecipe.slug,
            notes: notes.trim() || undefined,
          }),
        });
        setMessage(`Dropped: ${selectedRecipe.title}`);
        setSelectedRecipe(null);
        setNotes('');
      } else if (tab === 'manual' && customTitle) {
        await api('/api/admin/drop-recipe', {
          method: 'POST',
          body: JSON.stringify({
            custom_title: customTitle,
            custom_url: customUrl || undefined,
            notes: notes.trim() || undefined,
          }),
        });
        setMessage(`Dropped: ${customTitle}`);
        setCustomTitle('');
        setCustomUrl('');
        setNotes('');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to drop recipe');
    } finally {
      setDropping(false);
    }
  };

  useEffect(() => {
    if (search.length >= 2) {
      searchRecipes();
    }
  }, [search]);

  return (
    <div className="container">
      <Link to="/admin" className="back-link">← Back</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Drop Recipe</h1>
        <p className="page-subtitle">Share a recipe with the club</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${tab === 'catalog' ? 'active' : ''}`}
          onClick={() => setTab('catalog')}
        >
          From Catalog
        </button>
        <button
          className={`tab ${tab === 'manual' ? 'active' : ''}`}
          onClick={() => setTab('manual')}
        >
          Manual
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {tab === 'catalog' && (
        <>
          <div className="form-group">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes..."
              />
              <button
                className="btn btn-secondary"
                onClick={refreshCache}
                disabled={refreshing}
              >
                {refreshing ? '...' : 'Refresh'}
              </button>
            </div>
          </div>

          {recipes.length > 0 && (
            <div className="recipe-list">
              {recipes.map((recipe) => (
                <button
                  key={recipe.slug}
                  className={`card recipe-select ${selectedRecipe?.slug === recipe.slug ? 'selected' : ''}`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="card-title">{recipe.title}</div>
                </button>
              ))}
            </div>
          )}

          {selectedRecipe && (
            <div className="preview-card">
              <h3>Selected Recipe</h3>
              <p><strong>{selectedRecipe.title}</strong></p>
              <p className="text-muted">{selectedRecipe.url}</p>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label" htmlFor="catalogNotes">Notes (optional)</label>
                <textarea
                  id="catalogNotes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="A quick note about this recipe..."
                  rows={2}
                  maxLength={500}
                />
                <div className="form-hint">{notes.length}/500</div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleDrop}
                disabled={dropping}
                style={{ marginTop: '12px' }}
              >
                {dropping ? 'Dropping...' : 'Drop Recipe'}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'manual' && (
        <>
          <div className="form-group">
            <label className="form-label" htmlFor="customTitle">Recipe Title</label>
            <input
              id="customTitle"
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g., Chocolate Chip Cookies"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="customUrl">Recipe URL (optional)</label>
            <input
              id="customUrl"
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="manualNotes">Notes (optional)</label>
            <textarea
              id="manualNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="A quick note about this recipe..."
              rows={2}
              maxLength={500}
            />
            <div className="form-hint">{notes.length}/500</div>
          </div>

          <button
            className="btn btn-primary btn-large"
            onClick={handleDrop}
            disabled={dropping || !customTitle.trim()}
            style={{ width: '100%' }}
          >
            {dropping ? 'Dropping...' : 'Drop Recipe'}
          </button>
        </>
      )}
    </div>
  );
}
