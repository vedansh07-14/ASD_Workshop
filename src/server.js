// ============================================================
// SERVER ENTRY POINT
// ============================================================
// This file's only job is to start the HTTP server.
// All application configuration lives in app.js.
// ============================================================

const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("===========================================");
    console.log(`  Express Cache Workshop`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log("===========================================");
    console.log(`  GET  /products`);
    console.log(`  GET  /products/:id`);
    console.log(`  POST /products`);
    console.log(`  PUT  /products/:id`);
    console.log(`  PATCH /products/:id`);
    console.log(`  DELETE /products/:id`);
    console.log("===========================================");
});
