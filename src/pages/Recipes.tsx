import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ShelfItem {
  id: string;
  recipe_slug: string | null;
  custom_title: string | null;
  custom_url: string | null;
  cached_title: string | null;
  cached_url: string | null;
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

export default function Recipes() {
  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShelf = async () => {
      try {
        const data = await api<ShelfData>('/api/recipes/shelf');
        setShelf(data);
      } catch (error) {
        console.error('Failed to load recipes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShelf();
  }, []);

  const openRecipe = (item: ShelfItem) => {
    const url = item.custom_url || item.cached_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
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

  const hasContent = shelf && (shelf.featured.length > 0 || shelf.collections.some(c => c.items.length > 0));

  return (
    <div className="container">
      <header className="page-header">
        <h1 className="page-title">Recipes</h1>
        <p className="page-subtitle">Curated shelf</p>
      </header>

      {!hasContent ? (
        <div className="empty-state">
          <p>No recipes yet</p>
          <p className="text-muted">Check back soon!</p>
        </div>
      ) : (
        <>
          {shelf.featured.length > 0 && (
            <section className="section">
              <h2 className="section-title">Featured</h2>
              {shelf.featured.map((item) => (
                <button
                  key={item.id}
                  className="card recipe-card"
                  onClick={() => openRecipe(item)}
                >
                  <div className="card-title">{getTitle(item)}</div>
                </button>
              ))}
            </section>
          )}

          {shelf.collections.map((collection) =>
            collection.items.length > 0 ? (
              <section key={collection.id} className="section">
                <h2 className="section-title">{collection.name}</h2>
                {collection.items.map((item) => (
                  <button
                    key={item.id}
                    className="card recipe-card"
                    onClick={() => openRecipe(item)}
                  >
                    <div className="card-title">{getTitle(item)}</div>
                  </button>
                ))}
              </section>
            ) : null
          )}
        </>
      )}
    </div>
  );
}
