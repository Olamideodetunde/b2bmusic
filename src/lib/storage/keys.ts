/**
 * A master object key is a relative path inside the private bucket, e.g. "masters/titan-ascent.wav".
 * Never a URL (that would make the file public) and never with ".." segments.
 */
export function isValidObjectKey(key: string): boolean {
  return /^(?!\/)(?!.*\.\.)[A-Za-z0-9!_.*'()\-/]{1,900}$/.test(key) && !/^https?:/i.test(key);
}
