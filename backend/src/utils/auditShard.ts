/** Stable hash (FNV-1a): the same key always gives the same shard 0..3. */
export function auditShard(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 4;
}
