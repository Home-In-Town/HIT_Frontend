/**
 * Derives a human-readable property type label from the project's
 * category/propertyType fields, falling back to the legacy 'flat'/'plot' type.
 *
 * Priority: propertyType > category > legacy type mapping
 */
export function getPropertyLabel(project: {
  category?: string;
  propertyType?: string;
  type?: string;
}): string {
  // Prefer the specific propertyType if available
  if (project.propertyType) return project.propertyType;

  // Fall back to category if set
  if (project.category) return project.category;

  // Legacy fallback
  if (project.type === 'plot') return 'Plot';
  return 'Apartment';
}
