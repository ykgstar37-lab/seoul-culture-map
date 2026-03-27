import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "seoul-culture-favorites-v2";

/**
 * Stores an array of place objects:
 * { id, name, category, district, lat, lng }
 */
export default function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((place) => {
    setFavorites((prev) => {
      const exists = prev.find((p) => p.id === place.id);
      if (exists) return prev.filter((p) => p.id !== place.id);
      return [...prev, {
        id: place.id,
        name: place.name,
        category: place.category,
        district: place.district,
        lat: place.lat || place.latitude,
        lng: place.lng || place.longitude,
      }];
    });
  }, []);

  const isFavorite = useCallback((placeId) => {
    return favorites.some((p) => p.id === placeId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
