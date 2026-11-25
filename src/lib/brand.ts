/**
 * Generates the dynamic workspace brand identity based on authenticated user data.
 *
 * Examples:
 * - "Arman" or "Arman Khan" -> "Arman's Devspace"
 * - "Rahul" or "Rahul Verma" -> "Rahul's Devspace"
 * - "Sanjana" -> "Sanjana's Devspace"
 * - Missing / unauthenticated -> "Devspace"
 */
export function getWorkspaceBrandName(name?: string | null): string {
  if (!name) return "Devspace";
  const trimmed = name.trim();
  if (!trimmed) return "Devspace";
  const firstName = trimmed.split(/\s+/)[0];
  if (!firstName) return "Devspace";
  return `${firstName}'s Devspace`;
}
