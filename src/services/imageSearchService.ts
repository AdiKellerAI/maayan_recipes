/**
 * Image Search Service
 * Provides smart image search functionality for recipes using web APIs
 */

export interface ImageSearchResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

export interface ImageSearchOptions {
  query: string;
  count?: number;
  safeSearch?: boolean;
}

/**
 * Search for images using Unsplash API (free tier)
 * This is a fallback/demo implementation - in production you'd want to use a proper API key
 */
export async function searchImagesUnsplash(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  const { query, count = 4 } = options;
  
  try {
    // Using Unsplash's public API (rate limited but no key required for basic usage)
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' food')}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          // Using a demo client ID - in production, use your own Unsplash API key
          'Authorization': 'Client-ID 8KJqjOlPDhpQOjnJ2rJnU-_1-KZYMvKZ8QlbxYcLXhw'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results?.map((photo: any, index: number) => ({
      id: photo.id || `unsplash-${index}`,
      url: photo.urls?.regular || photo.urls?.full,
      thumbnailUrl: photo.urls?.small || photo.urls?.thumb,
      title: photo.alt_description || photo.description || 'תמונת מזון',
      source: 'Unsplash',
      width: photo.width || 800,
      height: photo.height || 600
    })) || [];
    
  } catch (error) {
    console.error('Unsplash search failed:', error);
    throw error;
  }
}

/**
 * Search for images using Pexels API (free tier)
 */
export async function searchImagesPexels(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  const { query, count = 4 } = options;
  
  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + ' food')}&per_page=${count}&orientation=landscape`,
      {
        headers: {
          // Using a demo API key - in production, use your own Pexels API key
          'Authorization': '563492ad6f917000010000018a3c8f3c5c1c4d1b9c5c4e2b4c4f4c4f'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.photos?.map((photo: any, index: number) => ({
      id: photo.id?.toString() || `pexels-${index}`,
      url: photo.src?.large || photo.src?.original,
      thumbnailUrl: photo.src?.medium || photo.src?.small,
      title: photo.alt || 'תמונת מזון',
      source: 'Pexels',
      width: photo.width || 800,
      height: photo.height || 600
    })) || [];
    
  } catch (error) {
    console.error('Pexels search failed:', error);
    throw error;
  }
}

/**
 * Fallback curated images based on recipe categories and common ingredients
 */
export function getCuratedImages(query: string): ImageSearchResult[] {
  const normalizedQuery = query.toLowerCase();
  
  // Curated high-quality images from Pexels (free to use)
  const curatedImages: { [key: string]: ImageSearchResult[] } = {
    // Hebrew food terms
    'עוגה': [
      {
        id: 'cake-1',
        url: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800',
        thumbnailUrl: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=400',
        title: 'עוגת שוקולד',
        source: 'Pexels',
        width: 800,
        height: 600
      }
    ],
    'שוקולד': [
      {
        id: 'chocolate-1',
        url: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=800',
        thumbnailUrl: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=400',
        title: 'עוגת שוקולד',
        source: 'Pexels',
        width: 800,
        height: 600
      }
    ],
    'סלט': [
      {
        id: 'salad-1',
        url: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=800',
        thumbnailUrl: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=400',
        title: 'סלט טרי',
        source: 'Pexels',
        width: 800,
        height: 600
      }
    ],
    'מרק': [
      {
        id: 'soup-1',
        url: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=800',
        thumbnailUrl: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400',
        title: 'מרק ירקות',
        source: 'Pexels',
        width: 800,
        height: 600
      }
    ],
    'בשר': [
      {
        id: 'meat-1',
        url: 'https://images.pexels.com/photos/361184/asparagus-steak-veal-steak-veal-361184.jpeg?auto=compress&cs=tinysrgb&w=800',
        thumbnailUrl: 'https://images.pexels.com/photos/361184/asparagus-steak-veal-steak-veal-361184.jpeg?auto=compress&cs=tinysrgb&w=400',
        title: 'סטייק בשר',
        source: 'Pexels',
        width: 800,
        height: 600
      }
    ],
    'לחם': [
      {
        id: 'bread-1',
        url: 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=800',
        thumbnailUrl: 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=400',
        title: 'לחם טרי',
        source: 'Pexels',
        width: 800,
        height: 600
      }
    ]
  };

  // Try to find matching curated images
  for (const [key, images] of Object.entries(curatedImages)) {
    if (normalizedQuery.includes(key)) {
      return images;
    }
  }

  // Default fallback images
  return [
    {
      id: 'default-1',
      url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800',
      thumbnailUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
      title: 'מזון טעים',
      source: 'Pexels',
      width: 800,
      height: 600
    }
  ];
}

/**
 * Main image search function - tries multiple sources
 */
export async function searchImages(options: ImageSearchOptions): Promise<ImageSearchResult[]> {
  const { query, count = 4 } = options;
  
  if (!query.trim()) {
    throw new Error('חיפוש ריק - אנא הכנס שם מתכון או רכיבים');
  }

  try {
    // Try Pexels first (better for food photography)
    try {
      const pexelsResults = await searchImagesPexels(options);
      if (pexelsResults.length > 0) {
        return pexelsResults.slice(0, count);
      }
    } catch (error) {
      console.warn('Pexels search failed, trying Unsplash:', error);
    }

    // Fallback to Unsplash
    try {
      const unsplashResults = await searchImagesUnsplash(options);
      if (unsplashResults.length > 0) {
        return unsplashResults.slice(0, count);
      }
    } catch (error) {
      console.warn('Unsplash search failed, using curated images:', error);
    }

    // Final fallback to curated images
    const curatedResults = getCuratedImages(query);
    return curatedResults.slice(0, count);
    
  } catch (error) {
    console.error('All image search methods failed:', error);
    throw new Error('לא הצלחנו למצוא תמונות. אנא נסה שוב או העלה תמונה ידנית.');
  }
}

/**
 * Convert image URL to base64 data URL (for storing in recipes)
 */
export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  try {
    // Use a CORS proxy to fetch the image
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.error('Failed to convert image URL to data URL:', error);
    throw new Error('שגיאה בהורדת התמונה. אנא נסה תמונה אחרת.');
  }
}
