/**
 * Development-only logger for tracking and auditing Firestore operations.
 * Provides real-time visibility into Firestore read/write quota consumption.
 */

const IS_DEV = Boolean(
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('ais-dev') ||
    window.location.hostname.includes('127.0.0.1')
  ))
);

let sessionReadCount = 0;
let sessionWriteCount = 0;
const readLogMap: Record<string, number> = {};

export function logFirestoreRead(source: string, pathOrQuery: string, count = 1) {
  sessionReadCount += count;
  readLogMap[pathOrQuery] = (readLogMap[pathOrQuery] || 0) + count;

  if (IS_DEV) {
    console.info(
      `%c[Firestore READ] %c${pathOrQuery} %c(${source}) %c[Count: +${count} | Session Total: ${sessionReadCount}]`,
      'color: #06b6d4; font-weight: bold;',
      'color: #a78bfa; font-weight: 600;',
      'color: #94a3b8; font-style: italic;',
      'color: #10b981; font-weight: 500;'
    );
  }
}

export function logFirestoreWrite(source: string, path: string, operation: 'create' | 'update' | 'delete' | 'set' = 'set') {
  sessionWriteCount += 1;

  if (IS_DEV) {
    console.info(
      `%c[Firestore WRITE:${operation.toUpperCase()}] %c${path} %c(${source}) %c[Session Total: ${sessionWriteCount}]`,
      'color: #f59e0b; font-weight: bold;',
      'color: #fb923c; font-weight: 600;',
      'color: #94a3b8; font-style: italic;',
      'color: #10b981; font-weight: 500;'
    );
  }
}

export function getFirestoreReadAudit() {
  return {
    totalReads: sessionReadCount,
    totalWrites: sessionWriteCount,
    byPath: { ...readLogMap },
  };
}
