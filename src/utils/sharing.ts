/**
 * Sharing utility functions
 * Handles canonical URL generation for consistent sharing across different deployments
 */

/**
 * Get the canonical URL for sharing
 * This ensures that shared links always point to the main deployment, not preview deployments
 */
export const getCanonicalUrl = (): string => {
  const currentOrigin = window.location.origin;
  
  // If this is a Vercel preview deployment, use the main domain
  if (currentOrigin.includes('vercel.app') && currentOrigin.includes('-')) {
    // Extract the project name and use the main Vercel domain
    const projectMatch = currentOrigin.match(/https:\/\/([^-]+)-[^-]+-kellersn-gmailcoms-projects\.vercel\.app/);
    if (projectMatch) {
      // Use the main deployment ID (52w60q377) for consistent sharing
      return `https://${projectMatch[1]}-52w60q377-kellersn-gmailcoms-projects.vercel.app`;
    }
  }
  
  // For custom domains or other deployments, use the current origin
  return currentOrigin;
};

/**
 * Generate a shareable URL for a recipe
 */
export const getRecipeShareUrl = (recipeId: string): string => {
  return `${getCanonicalUrl()}/recipe/${recipeId}`;
};

/**
 * Generate a shareable URL for the current page
 */
export const getCurrentPageShareUrl = (): string => {
  const canonicalOrigin = getCanonicalUrl();
  const currentPath = window.location.pathname;
  return `${canonicalOrigin}${currentPath}`;
};
