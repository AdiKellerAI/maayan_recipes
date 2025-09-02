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
  
  console.log('🔍 SHARING DEBUG: Current origin:', currentOrigin);
  console.log('🔍 SHARING DEBUG: User agent:', navigator.userAgent);
  
  // Always use the main deployment URL for sharing to ensure consistency
  // This prevents issues with preview deployments and ensures all shared links work
  const mainDeploymentUrl = 'https://maayanrecipes-52w60q377-kellersn-gmailcoms-projects.vercel.app';
  
  // If we're on a Vercel deployment, always use the main deployment URL
  if (currentOrigin.includes('vercel.app')) {
    console.log('🔍 SHARING DEBUG: Using main deployment URL:', mainDeploymentUrl);
    return mainDeploymentUrl;
  }
  
  console.log('🔍 SHARING DEBUG: Using current origin:', currentOrigin);
  // For custom domains or other deployments, use the current origin
  return currentOrigin;
};

/**
 * Generate a shareable URL for a recipe
 */
export const getRecipeShareUrl = (recipeId: string): string => {
  const canonicalUrl = getCanonicalUrl();
  const shareUrl = `${canonicalUrl}/recipe/${recipeId}`;
  console.log('🔍 SHARING DEBUG: Generated share URL:', shareUrl);
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
