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
  
  console.log('🔍 SHARING: Current origin:', currentOrigin);
  
  // Always use the main deployment URL for sharing to ensure consistency
  // This prevents issues with preview deployments having different URLs
  if (currentOrigin.includes('maayanrecipes') && currentOrigin.includes('kellersn-gmailcoms-projects')) {
    const canonicalUrl = 'https://maayanrecipes-hyplbr3j4-kellersn-gmailcoms-projects.vercel.app';
    console.log('🔍 SHARING: Using canonical URL for sharing:', canonicalUrl);
    return canonicalUrl;
  }
  
  console.log('🔍 SHARING: Using current origin as canonical:', currentOrigin);
  // For custom domains or other deployments, use the current origin
  return currentOrigin;
};

/**
 * Generate a shareable URL for a recipe
 */
export const getRecipeShareUrl = (recipeId: string): string => {
  const canonicalUrl = getCanonicalUrl();
  const shareUrl = `${canonicalUrl}/recipe/${recipeId}`;
  console.log('🔍 SHARING: Generated recipe share URL:', shareUrl);
  return shareUrl;
};

/**
 * Generate a shareable URL for the current page
 */
export const getCurrentPageShareUrl = (): string => {
  const canonicalOrigin = getCanonicalUrl();
  const currentPath = window.location.pathname;
  return `${canonicalOrigin}${currentPath}`;
};
