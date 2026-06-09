/**
 * Simplifies a verbose YouTube video title into a short, user-friendly recipe name.
 *
 * Examples:
 *   "EGG BEJO | Burmese Street Food Egg Masala Recipe | Healthy Boiled Eggs"  → "Egg Bejo"
 *   "Chicken Biryani Recipe - Easy Method | How to Make"                       → "Chicken Biryani"
 *   "Quick & Easy Pasta Carbonara Recipe for Beginners"                        → "Pasta Carbonara"
 */
export function simplifyRecipeTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return 'My Recipe';

  // 1. Split on common YouTube title separators — take the FIRST segment only
  let title = rawTitle.split(/[|—–\-]/, 1)[0].trim();

  // 2. Remove common filler / marketing words (order matters: longest phrases first)
  const fillerPhrases = [
    'how to make', 'how to cook', 'how to prepare',
    'easy method', 'easy recipe', 'simple recipe', 'quick recipe',
    'step by step', 'for beginners', 'at home',
    'village style', 'street food', 'restaurant style', 'homemade',
    'healthy', 'special', 'traditional', 'authentic',
    'cooking in village', 'cooking video',
    'burmese', 'indian', 'chinese', 'thai', 'italian', 'korean',
    'recipe', 'cooking', 'cook',
  ];

  let lower = title.toLowerCase();
  for (const phrase of fillerPhrases) {
    // Remove phrase only if surrounded by word boundaries to avoid partial matches
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    title = title.replace(re, '');
  }

  // 3. Clean up punctuation and extra whitespace left behind
  title = title
    .replace(/[|,;:&!?]+/g, ' ')  // remove stray punctuation
    .replace(/\s{2,}/g, ' ')       // collapse multiple spaces
    .trim();

  // 4. Convert to Title Case
  title = title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  // 5. Fallback — if we stripped everything, use first segment of raw title in Title Case
  if (!title || title.length < 2) {
    title = rawTitle.split(/[|—–\-]/, 1)[0].trim();
    title = title.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  return title;
}
