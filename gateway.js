// gateway.js (CommonJS)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = require("./env");
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

// Helper to mount a proxy (prefix -> targetBaseOrEndpoint)
// Example: mount("/getAllPets", base + "all")  => /getAllPets -> .../all
//          mount("/getPetById", base)          => /getPetById/5 -> .../5
function mount(prefix, target) {
  if (!target) {
    console.error(`❌ Missing target for mount("${prefix}", ...)`);
    process.exit(1);
  }
  const pathRewriteMap = {};
  pathRewriteMap[`^${prefix}`] = "";

  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: pathRewriteMap,
      proxyTimeout: 5000,
      onError: (err, req, res) => {
        console.error(
          `Proxy error for ${prefix} -> ${target}`,
          err?.code || err?.message
        );
        res
          .status(502)
          .json({ error: "Upstream unavailable", service: prefix });
      },
    })
  );
}

// ---- Upstream bases (from env.js) ----
const petBase = config.services.PetAdoptionServices; // expects trailing slash in .env

// --- Mount each microservice endpoint (per your style) ---
mount("/getAllPets", petBase + "all"); // GET http://localhost:8080/getAllPets -> .../api/Pet/all
mount("/addPet", petBase + "add"); // POST http://localhost:8080/addPet   -> .../api/Pet/add
mount("/getPetById", petBase); // GET http://localhost:8080/getPetById/5 -> .../api/Pet/5
mount("/getAllAdoptions", petBase + "adoptions");
mount("/getAllReturns", petBase + "unadoptions");
mount("/getImagesById", petBase + "images");
mount("/AdoptPet", petBase + "adopt");
mount("/ReturnPet", petBase + "unadopt");
mount("/Reserve", petBase + "reserve");
mount("/Vacant", petBase + "vacant");
mount("/addImages", petBase + "add-images");
mount(
  "/petSwagger",
  "https://petadoptionwebapi-1.onrender.com/swagger/index.html"
);

// Other services (prefix-level passthroughs)
mount("/orders", config.services.orders);
mount("/ml", config.services.ml);
mount("/billing", config.services.billing);

// Health check
app.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// Start server
app.listen(config.port, () => {
  console.log(`✅ Gateway running on http://localhost:${config.port}`);
  console.log("Routes:");
  console.log(`  /getAllPets     -> ${petBase}all`);
  console.log(`  /addPet         -> ${petBase}add`);
  console.log(`  /getPetById/:id -> ${petBase}{id}`);
  console.log(`  /orders         -> ${config.services.orders}`);
  console.log(`  /ml             -> ${config.services.ml}`);
  console.log(`  /billing        -> ${config.services.billing}`);
});
