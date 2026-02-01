'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-utils';

interface ShelfItem {
  id: string;
  recipe_slug: string | null;
  custom_title: string | null;
  custom_url: string | null;
  cached_title: string | null;
  cached_url: string | null;
  collection_id: string | null;
  is_featured: number;
  sort_order: number;
}

interface Collection {
  id: string;
  name: string;
  items: ShelfItem[];
}

interface ShelfData {
  featured: ShelfItem[];
  collections: Collection[];
}

interface CachedRecipe {
  slug: string;
  title: string;
  url: string;
}

export default function ShelfPage() {
  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [recipes, setRecipes] = useState<CachedRecipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [addToCollection, setAddToCollection] = useState<string>('');
  const [addAsFeatured, setAddAsFeatured] = useState(false);

  // Collection modal state
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const loadData = async () => {
    try {
      const [shelfData, collectionsData] = await Promise.all([
        api<ShelfData>('/recipes/shelf'),
        api<Collection[]>('/collections'),
      ]);
      setShelf(shelfData);
      setCollections(collectionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const searchRecipes = async () => {
    try {
      const data = await api<CachedRecipe[]>(`/recipes/cache?search=${encodeURIComponent(search)}`);
      setRecipes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search recipes');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToShelf = async (recipe: CachedRecipe) => {
    try {
      await api('/recipes/shelf', {
        method: 'POST',
        body: JSON.stringify({
          recipe_slug: recipe.slug,
          collection_id: addToCollection || undefined,
          is_featured: addAsFeatured,
        }),
      });
      setShowAddModal(false);
      setSearch('');
      setRecipes([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to shelf');
    }
  };

  const removeFromShelf = async (id: string) => {
    if (!confirm('Remove from shelf?')) return;

    try {
      await api(`/recipes/shelf/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const toggleFeatured = async (item: ShelfItem) => {
    try {
      await api(`/recipes/shelf/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_featured: item.is_featured ? 0 : 1 }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      await api('/collections', {
        method: 'POST',
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });
      setShowCollectionModal(false);
      setNewCollectionName('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    }
  };

  const renderItem = (item: ShelfItem) => {
    const title = item.custom_title || item.cached_title || 'Untitled';
    return (
      <div key={item.id} className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="card-title">
              {title}
              {item.is_featured === 1 && (
                <span className="badge badge-accent" style={{ marginLeft: '8px' }}>Featured</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => toggleFeatured(item)}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
            >
              {item.is_featured ? 'Unfeature' : 'Feature'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => removeFromShelf(item.id)}
              style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--color-error)' }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="container">
        <div className="empty-state">Loading...</div>
      </main>
    );
  }

  return (
    <main className="container">
      <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px' }}>
        ← Back
      </Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Curate Shelf</h1>
        <p className="page-subtitle">Manage the recipe shelf</p>
      </header>

      {error && <div className="error-text" style={{ marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          Add Recipe
        </button>
        <button className="btn btn-secondary" onClick={() => setShowCollectionModal(true)}>
          New Collection
        </button>
      </div>

      {shelf?.featured && shelf.featured.length > 0 && (
        <section className="section">
          <h2 className="section-title">Featured</h2>
          {shelf.featured.map(renderItem)}
        </section>
      )}

      {shelf?.collections.map((collection) => (
        <section key={collection.id} className="section">
          <h2 className="section-title">{collection.name}</h2>
          {collection.items.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px' }}>
              No recipes in this collection
            </div>
          ) : (
            collection.items.map(renderItem)
          )}
        </section>
      ))}

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Add to Shelf</h2>

            <div className="form-group">
              <label className="form-label">Search Recipes</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                />
                <button className="btn btn-secondary" onClick={searchRecipes}>
                  Search
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Add to Collection</label>
              <select
                value={addToCollection}
                onChange={(e) => setAddToCollection(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
              >
                <option value="">None</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="toggle">
              <div className="toggle-label">Feature this recipe</div>
              <button
                type="button"
                className={`toggle-switch ${addAsFeatured ? 'active' : ''}`}
                onClick={() => setAddAsFeatured(!addAsFeatured)}
              />
            </div>

            {recipes.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '16px' }}>
                {recipes.map((recipe) => (
                  <button
                    key={recipe.slug}
                    className="card"
                    onClick={() => addToShelf(recipe)}
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div className="card-title">{recipe.title}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCollectionModal && (
        <div className="modal-backdrop" onClick={() => setShowCollectionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">New Collection</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="collectionName">Collection Name</label>
              <input
                id="collectionName"
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Breads, Cakes..."
                maxLength={100}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCollectionModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={createCollection}
                disabled={!newCollectionName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
