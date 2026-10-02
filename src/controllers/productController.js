// ============================================================
// CONTROLLER LAYER
// ============================================================
// Controllers are the bridge between HTTP and your application.
//
// Each controller function:
//   1. Reads data from the HTTP request  (req)
//   2. Calls the appropriate service function
//   3. Sends the HTTP response            (res)
//   4. Handles errors with try/catch
//
// Controllers do NOT:
//   - Access the database directly
//   - Contain business/validation logic  (that's the service's job)
//   - Implement caching                  (that's the middleware's job)
//
// Flow:  Route → [Cache Middleware] → Controller → Service → Database
// ============================================================

const productService = require("../services/productService");

// --------------------------------------------------
// GET /products
// --------------------------------------------------

async function getAllProducts(req, res) {
    try {
        const products = productService.getProducts();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve products" });
    }
}

// --------------------------------------------------
// GET /products/:id
// --------------------------------------------------

async function getProductById(req, res) {
    try {
        const product = productService.getProduct(req.params.id);

        if (!product) {
            // 404 — product does not exist
            return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve product" });
    }
}

// --------------------------------------------------
// POST /products
// --------------------------------------------------

async function createProduct(req, res) {
    try {
        const newProduct = productService.createProduct(req.body);
        // 201 Created — a new resource was created
        res.status(201).json(newProduct);
    } catch (error) {
        // Validation errors from the service layer are 400 Bad Request
        if (error.message.includes("must have") || error.message.includes("must be")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to create product" });
    }
}

// --------------------------------------------------
// PUT /products/:id  (full update)
// --------------------------------------------------

async function updateProduct(req, res) {
    try {
        const updated = productService.updateProduct(req.params.id, req.body);

        if (!updated) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json(updated);
    } catch (error) {
        if (error.message.includes("must have") || error.message.includes("must be")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to update product" });
    }
}

// --------------------------------------------------
// PATCH /products/:id  (partial update)
// --------------------------------------------------

async function patchProduct(req, res) {
    try {
        const patched = productService.patchProduct(req.params.id, req.body);

        if (!patched) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json(patched);
    } catch (error) {
        if (error.message.includes("must be")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to patch product" });
    }
}

// --------------------------------------------------
// DELETE /products/:id
// --------------------------------------------------

async function deleteProduct(req, res) {
    try {
        const deleted = productService.deleteProduct(req.params.id);

        if (!deleted) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.status(200).json({ message: "Product deleted", product: deleted });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete product" });
    }
}

// Export all controller functions
module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    patchProduct,
    deleteProduct,
};
