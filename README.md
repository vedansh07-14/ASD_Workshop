# Express Cache Workshop

A beginner-friendly Express.js application that demonstrates a clean **layered architecture** and **HTTP caching with middleware**.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Caching](#caching)
5. [Cache Invalidation](#cache-invalidation)
6. [Request Flow Examples](#request-flow-examples)
7. [HTTP Status Codes](#http-status-codes)
8. [Running the Project](#running-the-project)
9. [Testing with curl](#testing-with-curl)

---

## Project Overview

This application is a simple **Product API** built with Express.js.

It lets you:
- List all products
- Get a single product by ID
- Create, update, and delete products

More importantly, it demonstrates **how to structure a real-world Express application** using clearly separated layers, and how to add **in-memory caching** as middleware so GET requests don't hit the database on every call.

---

## Project Structure

```
ASD_Workshop/
│
├── src/
│   ├── routes/
│   │   └── productRoutes.js      ← defines URL endpoints
│   │
│   ├── middleware/
│   │   └── cacheMiddleware.js    ← caching logic lives here
│   │
│   ├── controllers/
│   │   └── productController.js  ← reads req, calls service, sends res
│   │
│   ├── services/
│   │   └── productService.js     ← business logic & validation
│   │
│   ├── database/
│   │   └── productDatabase.js    ← the only file that touches data
│   │
│   ├── app.js                    ← Express app setup
│   └── server.js                 ← starts the server
│
├── db.json               ← seed data (loaded at startup)
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

---

## Architecture

Every request travels through these layers **in order**:

```
Client (curl / browser / Postman)
      ↓
Route           productRoutes.js
      ↓
Middleware      cacheMiddleware.js    (GET requests only)
      ↓
Controller      productController.js
      ↓
Service         productService.js
      ↓
Database        productDatabase.js
```

### What each layer does

| Layer | File | Responsibility |
|---|---|---|
| **Route** | `productRoutes.js` | Maps HTTP methods + paths to handler functions |
| **Middleware** | `cacheMiddleware.js` | Intercepts GET requests; serves cached data or lets them through |
| **Controller** | `productController.js` | Reads `req`, calls the service, sends `res` |
| **Service** | `productService.js` | Business rules and validation (no HTTP, no raw data) |
| **Database** | `productDatabase.js` | The only place that reads/writes the product array |

Each layer **only talks to the layer directly below it**. The controller never touches the database directly, and the database never knows about HTTP requests.

---

## Caching

### What is caching?

Caching means **storing the result of an expensive operation so you can reuse it** instead of doing the work again.

In this application:
- The "expensive operation" is fetching product data
- The "cache" is a JavaScript `Map` stored in memory
- When a GET request arrives, we check the cache **before** going to the database

### Why only cache GET requests?

GET requests **read** data — they don't change anything. Running the same GET query multiple times should always return the same result (until something changes), so caching them is safe.

POST, PUT, PATCH, and DELETE **modify** data, so they must always hit the real database. You would never want to serve a cached "product created" response.

### Cache HIT

A **cache HIT** means the requested data was found in the cache and is still fresh.

```
Client: GET /products
Cache:  ✅ Found! Data is 12 seconds old (< 60 seconds) → HIT

Response header:  X-Cache: HIT
```

On a HIT, the controller, service, and database are **never called**. The response comes straight from the cache.

### Cache MISS

A **cache MISS** means either:
1. No entry exists for this URL, or
2. An entry exists but it has expired (older than 60 seconds)

```
Client: GET /products
Cache:  ❌ Not found → MISS

Response header:  X-Cache: MISS
```

On a MISS, the request continues to the controller → service → database, and the fresh result is stored in the cache before being returned.

### TTL (Time To Live)

**TTL** is how long cached data is considered "fresh".

In this application:

```js
const CACHE_TTL = 60 * 1000; // 60 000 milliseconds = 1 minute
```

### Why does each cache entry store `createdAt`?

Every cache entry is stored like this:

```js
{
    data: { id: 1, name: "Laptop", price: 75000 },
    createdAt: 1727854200000   // Date.now() when it was cached
}
```

`createdAt` is the **timestamp** of when the data was cached. Without it, we would have no way to know how old the entry is.

To check freshness:

```js
const age = Date.now() - cachedEntry.createdAt;

if (age < CACHE_TTL) {
    // still fresh — return cached data
} else {
    // expired — delete and fetch again
}
```

### What happens when the cache expires?

```
Client: GET /products (62 seconds after last request)
Cache:  Entry found, but age = 62 000ms > 60 000ms → EXPIRED

Action:
  1. Delete the stale entry
  2. Continue to controller → service → database
  3. Get fresh data
  4. Store fresh data in cache (new createdAt)
  5. Return fresh data to client

Response header:  X-Cache: MISS
```

---

## Cache Invalidation

**Cache invalidation** means removing cached data when the underlying data has changed.

### Why invalidate?

Imagine this sequence:

```
GET /products        → returns ["Laptop", "Keyboard", "Mouse"]
                     → stored in cache

PUT /products/1      → changes Laptop price to 80 000
                     → but cache still says 75 000!

GET /products        → returns stale cache → ❌ WRONG PRICE
```

This is why we **clear the cache** after every successful modification.

### When does invalidation happen?

| HTTP Method | Operation | Invalidates cache? |
|---|---|---|
| GET | Read | ❌ No |
| POST | Create | ✅ Yes |
| PUT | Full update | ✅ Yes |
| PATCH | Partial update | ✅ Yes |
| DELETE | Delete | ✅ Yes |

### How does it work?

```js
cache.clear(); // wipes all entries
```

We clear **all** entries (not just the affected product) because:
- Updating product 1 makes `GET /products` stale too
- Deleting product 2 changes the full list

Cache invalidation happens **only after a successful database operation**. If the database returns an error (e.g. product not found), the cache is left untouched.

---

## Request Flow Examples

### `GET /products` (first request)

```
1. Route matches GET /products
2. cacheMiddleware runs
   → cache.get("/products") → undefined (MISS)
   → sets X-Cache: MISS header
   → wraps res.json() to intercept the response
   → calls next()
3. Controller: productController.getAllProducts()
4. Service:    productService.getProducts()
5. Database:   productDatabase.getAllProducts()
   → returns [{ id:1, ... }, { id:2, ... }, { id:3, ... }]
6. Controller calls res.json(products)
7. Intercepted res.json saves data to cache with createdAt: now
8. Original res.json sends response to client
```

### `GET /products` (second request, within 1 minute)

```
1. Route matches GET /products
2. cacheMiddleware runs
   → cache.get("/products") → found! age < 60 000ms (HIT)
   → sets X-Cache: HIT header
   → calls res.json(cachedData) immediately
3. ✅ Controller / Service / Database are NOT called
```

### `GET /products/1`

```
1. Route matches GET /products/1
2. cacheMiddleware uses key "/products/1" (different from "/products")
   → separate cache entry, independent TTL
3. On MISS → Controller → Service → Database → cache stored
```

### `POST /products`

```
1. Route matches POST /products
2. cacheMiddleware is NOT applied (POST is not GET)
3. Controller reads req.body → calls productService.createProduct()
4. Service validates data → calls productDatabase.createProduct()
5. New product saved, returned to controller
6. Controller sends 201 Created response
7. invalidateCache() runs → cache.clear()
   → all cached GET responses wiped
```

### `PUT /products/1`

```
1. Route matches PUT /products/1
2. No cache middleware (it's a PUT)
3. Controller → Service validates → Database updates product
4. Controller sends 200 OK
5. invalidateCache() → cache.clear()
   → next GET /products will be a MISS again
```

### `DELETE /products/1`

```
1. Route matches DELETE /products/1
2. Controller → Service → Database.deleteProduct(1)
3. If product not found → 404, cache NOT cleared
4. If deleted successfully → 200 OK
5. invalidateCache() → cache.clear()
```

---

## HTTP Status Codes

| Situation | Status Code |
|---|---|
| GET successful | `200 OK` |
| POST successful | `201 Created` |
| PUT successful | `200 OK` |
| PATCH successful | `200 OK` |
| DELETE successful | `200 OK` |
| Product not found | `404 Not Found` |
| Invalid request body | `400 Bad Request` |
| Unexpected server error | `500 Internal Server Error` |

---

## Running the Project

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Install dependencies

```bash
npm install
```

### Start the server

```bash
npm start
```

The server starts on **http://localhost:3000**.

### Development mode (auto-restart on file changes)

```bash
npm run dev
```

This uses `nodemon` to watch for file changes and restart the server automatically — useful when you're editing the code.

---

## Testing with curl

### List all products

```bash
curl http://localhost:3000/products
```

### Get a single product

```bash
curl http://localhost:3000/products/1
```

### See cache headers (use `-i` to include response headers)

First request — expect `X-Cache: MISS`:

```bash
curl -i http://localhost:3000/products
```

Second request (within 60 seconds) — expect `X-Cache: HIT`:

```bash
curl -i http://localhost:3000/products
```

### Create a new product

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Monitor", "price": 18000}'
```

### Full update (PUT)

```bash
curl -X PUT http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Gaming Laptop", "price": 95000}'
```

### Partial update (PATCH)

```bash
curl -X PATCH http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 80000}'
```

### Delete a product

```bash
curl -X DELETE http://localhost:3000/products/1
```

### Demonstrate full cache lifecycle

```bash
# 1. First request → MISS (fills cache)
curl -i http://localhost:3000/products

# 2. Second request → HIT (served from cache)
curl -i http://localhost:3000/products

# 3. Modify data → cache cleared
curl -X PATCH http://localhost:3000/products/2 \
  -H "Content-Type: application/json" \
  -d '{"price": 3000}'

# 4. Next request → MISS again (cache was invalidated)
curl -i http://localhost:3000/products
```

---

## Complete Request Lifecycle Summary

```
1. HTTP request arrives at Express
2. express.json() parses the request body (for POST/PUT/PATCH)
3. Router matches the URL and HTTP method
4. [GET only] cacheMiddleware checks the cache:
      HIT  → respond immediately, skip steps 5-7
      MISS → set X-Cache: MISS, wrap res.json(), call next()
5. Controller reads req, calls the appropriate service function
6. Service validates input, calls the appropriate database function
7. Database reads/writes the in-memory products array, returns result
8. Controller calls res.json(result)
9. [GET MISS] Wrapped res.json saves result to cache, then sends it
   [Mutating] Controller sends response; invalidateCache() runs after
```
