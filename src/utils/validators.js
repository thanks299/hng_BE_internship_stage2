export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Missing or empty name' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Missing or empty name' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, message: 'Name too long (max 100 characters)' };
  }
  
  // Check if name contains only valid characters (letters, spaces, hyphens, apostrophes)
  const validNameRegex = /^[a-zA-Z\s\-']+$/;
  if (!validNameRegex.test(trimmed)) {
    return { valid: false, message: 'Invalid name format' };
  }
  
  return { valid: true, name: trimmed };
}