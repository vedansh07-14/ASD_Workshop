// ============================================================
// ROUTES
// ============================================================
// This file wires HTTP endpoints to their handlers.
//
// Each route entry has three parts:
//   1. HTTP method + path         (e.g. GET /products)
//   2. Cache middleware            (only on GET routes)
//   3. Controller function         (does the actual work)
//
// The cacheMiddleware runs BEFORE the controller on GET routes.
// If there is a cache HIT, the controller is never called.
//
// For mutating routes (POST / PUT / PATCH / DELETE), we wrap
// the controller so that invalidateCache() is called ONLY when
// the database operation succeeds (2xx response).
// ============================================================

const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const { cacheMiddleware, invalidateCache } = require("../middleware/cacheMiddleware");

// --------------------------------------------------
// READ routes — use cacheMiddleware
// --------------------------------------------------

// GET /products
// Flow: cacheMiddleware → (HIT → respond) | (MISS → controller)
router.get("/products", cacheMiddleware, productController.getAllProducts);

// GET /products/:id
router.get("/products/:id", cacheMiddleware, productController.getProductById);

// --------------------------------------------------
// Helpers: wrap a controller so cache is invalidated
// only after a successful (2xx) response.
//
// HOW IT WORKS:
//   We replace res.json with a wrapper function.
//   When the controller calls res.json(data), our wrapper:
//     1. Checks if the status code is a success (2xx)
//     2. If yes, clears the cache BEFORE sending the response
//     3. Calls the original res.json to actually send the response
//
// This is the same "method wrapping" pattern used in
// cacheMiddleware, but applied for invalidation instead of saving.
// --------------------------------------------------

function withCacheInvalidation(controllerFn) {
    return async function (req, res, next) {
        // Save a reference to the real res.json
        const originalJson = res.json.bind(res);

        // Replace res.json with our wrapper
        res.json = function (data) {
            // Restore the original first so we don't double-wrap
            res.json = originalJson;

            // Only invalidate if the operation succeeded
            if (res.statusCode >= 200 && res.statusCode < 300) {
                invalidateCache();
            }

            // Send the actual response
            return originalJson(data);
        };

        // Run the real controller
        await controllerFn(req, res, next);
    };
}

// --------------------------------------------------
// MUTATING routes — invalidate cache after success
// --------------------------------------------------

// POST /products — create a new product
router.post("/products", withCacheInvalidation(productController.createProduct));

// PUT /products/:id — full update
router.put("/products/:id", withCacheInvalidation(productController.updateProduct));

// PATCH /products/:id — partial update
router.patch("/products/:id", withCacheInvalidation(productController.patchProduct));

// DELETE /products/:id
router.delete("/products/:id", withCacheInvalidation(productController.deleteProduct));

module.exports = router;
