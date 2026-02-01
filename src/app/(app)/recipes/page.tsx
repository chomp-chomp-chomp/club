'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-utils';

interface ShelfItem {
  id: string;
  recipe_slug: string | null;
  custom_title: string | null;
  custom_url: string | null;
  cached_title: string | null;
  cached_url: string | null;
  excerpt: string | null;
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

export default function RecipesPage() {
  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShelf = async () => {
      try {
        const data = await api<ShelfData>('/recipes/shelf');
        setShelf(data);
      } catch (err) {
        console.error('Failed to load shelf:', err);
      } finally {
        setLoading(false);
      }
    };

    loadShelf();
  }, []);

  const renderItem = (item: ShelfItem) => {
    const title = item.custom_title || item.cached_title || 'Untitled';
    const url = item.custom_url || item.cached_url;

    return (
      <a
        key={item.id}
        href={url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="card"
        style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        <div className="card-title">{title}</div>
        {item.excerpt && (
          <div className="card-body" style={{ marginTop: '4px' }}>
            {item.excerpt}
          </div>
        )}
      </a>
    );
  };

  if (loading) {
    return (
      <main className="container">
        <header className="page-header">
          <h1 className="page-title">Recipes</h1>
        </header>
        <div className="empty-state">Loading...</div>
      </main>
    );
  }

  const hasContent =
    shelf && (shelf.featured.length > 0 || shelf.collections.some((c) => c.items.length > 0));

  return (
    <main className="container">
      <header className="page-header">
        <h1 className="page-title">Recipes</h1>
        <p className="page-subtitle">Curated by the club</p>
      </header>

      {!hasContent ? (
        <div className="empty-state">
          <p>No recipes yet</p>
          <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
            The club admin will add recipes soon.
          </p>
        </div>
      ) : (
        <>
          {shelf!.featured.length > 0 && (
            <section className="section">
              <h2 className="section-title">Featured</h2>
              {shelf!.featured.map(renderItem)}
            </section>
          )}

          {shelf!.collections.map(
            (collection) =>
              collection.items.length > 0 && (
                <section key={collection.id} className="section">
                  <h2 className="section-title">{collection.name}</h2>
                  {collection.items.map(renderItem)}
                </section>
              )
          )}
        </>
      )}
    </main>
  );
}
