// ============================================================
// CACHE MIDDLEWARE
// ============================================================
// This file implements in-memory caching for GET requests.
//
// KEY CONCEPTS demonstrated here:
//   - Cache HIT   : data is already in cache and still fresh
//   - Cache MISS  : data is not in cache (or has expired)
//   - TTL         : Time To Live — how long cached data is valid
//   - Cache key   : the unique identifier for each cached response
//   - Invalidation: clearing stale cache after data changes
//   - Response interception: wrapping res.json() to capture output
//
// The cache sits between the Route and the Controller:
//
//   Route
//     ↓
//   Cache Middleware   ← you are here
//     ↓ (MISS only)
//   Controller → Service → Database
// ============================================================

// ---- The cache store ----------------------------------------
// A plain JavaScript Map is all we need.
// Key   → request URL string  (e.g. "/products" or "/products/1")
// Value → { data: <response body>, createdAt: <timestamp ms> }
// ------------------------------------------------------------
const cache = new Map();

// ---- TTL (Time To Live) ------------------------------------
// Cached data is considered "fresh" for exactly 1 minute.
// After that it expires and we fetch new data from the database.
// ------------------------------------------------------------
const CACHE_TTL = 60 * 1000; // 60 000 milliseconds = 1 minute

// ============================================================
// cacheMiddleware
// ============================================================
// Express middleware that runs before every route handler.
// It only applies caching logic to GET requests.
// ============================================================

function cacheMiddleware(req, res, next) {
    // --------------------------------------------------------
    // STEP 1: Only cache GET requests.
    // POST / PUT / PATCH / DELETE modify data, so they should
    // NEVER be served from cache.
    // --------------------------------------------------------
    if (req.method !== "GET") {
        return next(); // skip caching entirely for non-GET requests
    }

    // --------------------------------------------------------
    // STEP 2: Build the cache key from the request URL.
    // Examples:
    //   GET /products   → key = "/products"
    //   GET /products/1 → key = "/products/1"
    // --------------------------------------------------------
    const cacheKey = req.url;

    // --------------------------------------------------------
    // STEP 3: Check whether a cache entry exists for this key.
    // --------------------------------------------------------
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry) {
        // ---- Entry found — check if it is still fresh ------
        const age = Date.now() - cachedEntry.createdAt; // milliseconds since stored

        if (age < CACHE_TTL) {
            // ✅ CACHE HIT — data is fresh, return it immediately.
            // The controller, service, and database are NOT called.
            console.log(`[CACHE] HIT  → ${cacheKey}  (age: ${Math.round(age / 1000)}s)`);

            res.setHeader("X-Cache", "HIT");              // tell the client it's cached
            return res.status(200).json(cachedEntry.data); // respond right away
        }

        // ❌ Entry exists but it has EXPIRED — remove the stale entry
        // and fall through to fetch fresh data below.
        console.log(`[CACHE] EXPIRED → ${cacheKey}  (age: ${Math.round(age / 1000)}s)`);
        cache.delete(cacheKey);
    }

    // --------------------------------------------------------
    // STEP 4: CACHE MISS
    // No valid cache entry was found (either missing or expired).
    // We need to:
    //   a) Let the request continue to the controller
    //   b) Intercept the response so we can save it in the cache
    //      before it reaches the client
    // --------------------------------------------------------
    console.log(`[CACHE] MISS → ${cacheKey}`);
    res.setHeader("X-Cache", "MISS"); // tell the client it's a cache miss

    // --------------------------------------------------------
    // STEP 5: Intercept res.json()
    //
    // WHY? Express sends the response inside the controller via
    // res.json(data). By the time control returns to this middleware
    // after next(), the response has already been sent — we can no
    // longer read what the controller wrote.
    //
    // SOLUTION: We replace res.json with our own function.
    // Our wrapper:
    //   1. Saves the response data in the cache
    //   2. Then calls the ORIGINAL res.json to actually send it
    //
    // This pattern is called "monkey-patching" or "method wrapping".
    // It keeps the caching logic entirely inside this middleware —
    // the controller never needs to know about the cache.
    // --------------------------------------------------------

    const originalJson = res.json.bind(res); // keep a reference to the real res.json

    res.json = function (data) {
        // Only cache successful (2xx) responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
            cache.set(cacheKey, {
                data: data,
                createdAt: Date.now(), // record WHEN we cached this
            });
            console.log(`[CACHE] STORED → ${cacheKey}`);
        }

        // Restore and call the original res.json to send the response
        res.json = originalJson;
        return originalJson(data);
    };

    // Continue to the next middleware / controller
    next();
}

// ============================================================
// invalidateCache
// ============================================================
// Call this after any successful data modification (POST, PUT,
// PATCH, DELETE) to ensure clients don't receive stale data.
//
// We clear the ENTIRE cache here because:
//   - Updating one product makes GET /products stale too
//   - Simplicity is the priority in a workshop setting
//
// In a production system you might remove only related keys.
// ============================================================

function invalidateCache() {
    const size = cache.size;
    cache.clear();
    console.log(`[CACHE] INVALIDATED — cleared ${size} entr${size === 1 ? "y" : "ies"}`);
}

module.exports = { cacheMiddleware, invalidateCache };
