import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

interface ShelfItem {
  id: string;
  recipe_slug: string | null;
  custom_title: string | null;
  cached_title: string | null;
  is_featured: number;
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

export default function Shelf() {
  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [search, setSearch] = useState('');
  const [recipes, setRecipes] = useState<CachedRecipe[]>([]);
  const [addToCollection, setAddToCollection] = useState('');
  const [addAsFeatured, setAddAsFeatured] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [shelfData, collectionsData] = await Promise.all([
        api<ShelfData>('/api/recipes/shelf'),
        api<Collection[]>('/api/collections'),
      ]);
      setShelf(shelfData);
      setCollections(collectionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const searchRecipes = async () => {
    try {
      const data = await api<CachedRecipe[]>(`/api/recipes/cache?search=${encodeURIComponent(search)}`);
      setRecipes(data);
    } catch {
      // ignore
    }
  };

  const addToShelf = async (recipe: CachedRecipe) => {
    try {
      await api('/api/recipes/shelf', {
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
      setError(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  const removeFromShelf = async (id: string) => {
    if (!confirm('Remove from shelf?')) return;
    try {
      await api(`/api/recipes/shelf/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const toggleFeatured = async (item: ShelfItem) => {
    try {
      await api(`/api/recipes/shelf/${item.id}`, {
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
      await api('/api/collections', {
        method: 'POST',
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });
      setShowCollectionModal(false);
      setNewCollectionName('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  const getTitle = (item: ShelfItem) => item.custom_title || item.cached_title || 'Untitled';

  if (loading) {
    return (
      <div className="container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to="/admin" className="back-link">← Back</Link>

      <header className="page-header" style={{ textAlign: 'left', paddingLeft: 0 }}>
        <h1 className="page-title">Curate Shelf</h1>
        <p className="page-subtitle">Manage the recipe shelf</p>
      </header>

      {error && <div className="error-text">{error}</div>}

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
          {shelf.featured.map((item) => (
            <div key={item.id} className="card shelf-item">
              <div className="shelf-item-content">
                <span className="badge badge-accent">Featured</span>
                <span>{getTitle(item)}</span>
              </div>
              <div className="shelf-item-actions">
                <button className="btn-icon" onClick={() => toggleFeatured(item)}>Unfeature</button>
                <button className="btn-icon danger" onClick={() => removeFromShelf(item.id)}>Remove</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {shelf?.collections.map((collection) => (
        <section key={collection.id} className="section">
          <h2 className="section-title">{collection.name}</h2>
          {collection.items.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px' }}>Empty</div>
          ) : (
            collection.items.map((item) => (
              <div key={item.id} className="card shelf-item">
                <span>{getTitle(item)}</span>
                <div className="shelf-item-actions">
                  <button className="btn-icon" onClick={() => toggleFeatured(item)}>Feature</button>
                  <button className="btn-icon danger" onClick={() => removeFromShelf(item.id)}>Remove</button>
                </div>
              </div>
            ))
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
                <button className="btn btn-secondary" onClick={searchRecipes}>Search</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Add to Collection</label>
              <select
                value={addToCollection}
                onChange={(e) => setAddToCollection(e.target.value)}
                className="select"
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
              <div className="recipe-search-results">
                {recipes.map((recipe) => (
                  <button
                    key={recipe.slug}
                    className="card recipe-select"
                    onClick={() => addToShelf(recipe)}
                  >
                    {recipe.title}
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
    </div>
  );
}
