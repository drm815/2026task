/**
 * 모듈 레벨 인메모리 캐시 (GAS API 중복 요청 방어)
 * - TTL 만료 시 자동 재요청
 * - 진행 중인 요청 공유 (request deduplication)
 * - invalidate()로 즉시 무효화
 */

const TTL_MS = 30_000; // 30초

const cache = new Map(); // key → { data, expiresAt }
const inflight = new Map(); // key → Promise

/**
 * GAS GET 요청을 캐시와 함께 실행
 * @param {string} url - 전체 fetch URL (캐시 키로 사용)
 * @returns {Promise<any>}
 */
export async function cachedFetch(url) {
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && hit.expiresAt > now) return hit.data;

    // 동일 URL 동시 요청 → 하나의 Promise 공유
    if (inflight.has(url)) return inflight.get(url);

    const promise = fetch(url)
        .then(r => r.json())
        .then(data => {
            cache.set(url, { data, expiresAt: Date.now() + TTL_MS });
            inflight.delete(url);
            return data;
        })
        .catch(err => {
            inflight.delete(url);
            throw err;
        });

    inflight.set(url, promise);
    return promise;
}

/**
 * 특정 action의 캐시를 무효화
 * @param {string} action - 무효화할 action 이름 (예: 'getAssessments')
 */
export function invalidateCache(action) {
    for (const key of cache.keys()) {
        if (key.includes(`action=${action}`)) cache.delete(key);
    }
}
