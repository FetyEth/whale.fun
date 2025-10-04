// Token metadata utilities for handling combined description with social links

export interface TokenMetadata {
  description: string;
  website?: string;
  telegram?: string;
  twitter?: string;
}

/**
 * Combines token metadata into a single description string for storage
 */
export function combineTokenMetadata(metadata: TokenMetadata): string {
  const combined = {
    description: metadata.description || "",
    website: metadata.website || "",
    telegram: metadata.telegram || "",
    twitter: metadata.twitter || ""
  };
  
  // Only include non-empty fields to keep the string clean
  const filtered = Object.fromEntries(
    Object.entries(combined).filter(([_, value]) => value.trim() !== "")
  );
  
  return JSON.stringify(filtered);
}

/**
 * Parses a combined description string back into separate metadata fields
 */
export function parseTokenMetadata(combinedDescription: string): TokenMetadata {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(combinedDescription);
    
    return {
      description: parsed.description || "",
      website: parsed.website || "",
      telegram: parsed.telegram || "",
      twitter: parsed.twitter || ""
    };
  } catch (error) {
    // If not valid JSON, treat the entire string as description
    return {
      description: combinedDescription || "",
      website: "",
      telegram: "",
      twitter: ""
    };
  }
}

/**
 * Safely extracts the description text only
 */
export function getTokenDescription(combinedDescription: string): string {
  const metadata = parseTokenMetadata(combinedDescription);
  return metadata.description;
}

/**
 * Safely extracts social links only
 */
export function getTokenSocialLinks(combinedDescription: string): {
  website?: string;
  telegram?: string;
  twitter?: string;
} {
  const metadata = parseTokenMetadata(combinedDescription);
  return {
    website: metadata.website,
    telegram: metadata.telegram,
    twitter: metadata.twitter
  };
}