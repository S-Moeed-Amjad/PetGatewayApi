// gateway.js (CommonJS)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = require("./env");
const app = express();

app.set("trust proxy", 1); // correct client IPs behind proxies/load balancers
app.use(cors());
// app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Answer CORS preflights locally so they don't hit upstream
app.options("*", (req, res) => res.sendStatus(204));

// Helper: mount proxy that forwards bodies for non-GET methods
function safeMount(prefix, target) {
  if (!target) {
    console.warn(`⚠️ Skipping mount("${prefix}") — no target provided`);
    return;
  }
  const pathRewriteMap = {};
  pathRewriteMap[`^${prefix}`] = "";

  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true, // add X-Forwarded-* headers
      pathRewrite: pathRewriteMap,
      proxyTimeout: 5000,

      onProxyReq: (proxyReq, req) => {
        // forward parsed bodies for POST/PUT/PATCH/DELETE
        if (
          !["GET", "HEAD"].includes(req.method) &&
          req.body &&
          Object.keys(req.body).length
        ) {
          const ct = req.headers["content-type"] || "";
          let bodyData;
          if (ct.includes("application/json")) {
            bodyData = JSON.stringify(req.body);
            proxyReq.setHeader("Content-Type", "application/json");
          } else if (ct.includes("application/x-www-form-urlencoded")) {
            bodyData = new URLSearchParams(req.body).toString();
            proxyReq.setHeader(
              "Content-Type",
              "application/x-www-form-urlencoded"
            );
          }
          if (bodyData) {
            proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
          }
        }
        proxyReq.setHeader(
          "x-correlation-id",
          `${Date.now()}-${Math.random()}`
        );
      },

      onProxyRes: (proxyRes, req, res) => {
        res.setHeader("x-via", "node-gateway");
        res.setHeader("x-upstream", target);
        if (proxyRes.statusCode === 429) {
          console.warn(
            `[UPSTREAM 429] ${req.method} ${req.originalUrl} -> ${target}  ip=${req.ip}`
          );
        }
      },

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

// ---- Upstream bases ----
const petBase = config.services.PetAdoptionServices; // expects trailing slash in .env
const medHost = "https://medication-service.onrender.com";

// --- Pet Adoption endpoints ---
safeMount("/getAllPets", petBase + "all");
safeMount("/addPet", petBase + "add");
safeMount("/editPet", petBase + "edit");
safeMount("/deletePet", petBase + "delete");
safeMount("/getPetByOwner", petBase + "by-owner");
safeMount("/getPetById", petBase); // /getPetById/5 -> .../api/Pet/5
safeMount("/getAllAdoptions", petBase + "adoptions");
safeMount("/getAllReturns", petBase + "unadoptions");
safeMount("/getImagesById", petBase + "images");
safeMount("/AdoptPet", petBase + "adopt");
safeMount("/ReturnPet", petBase + "unadopt");
safeMount("/Reserve", petBase + "reserve");
safeMount("/Vacant", petBase + "vacant");
safeMount("/addImages", petBase + "add-images");
// Swagger bundle
safeMount("/swagger", "https://petadoptionwebapi-1.onrender.com/swagger");

// --- Treatment services ---
safeMount("/add-treatment", `${medHost}/add-treatments`);
safeMount("/all-treatments", `${medHost}/all-treatments`);
safeMount("/treatments", `${medHost}/treatments`); // /treatments/:pet_id
safeMount("/treatment", `${medHost}/treatment`); // /treatment/:id
safeMount("/update-treatment", `${medHost}/update-treatment`); // /update-treatment/:id
safeMount("/delete-treatment", `${medHost}/delete-treatment`); // /delete-treatment/:id

// --- Other services ---
safeMount("/orders", config.services.orders);
safeMount("/ml", config.services.ml);

// --- Payment APIs ---
safeMount(
  "/stripeCheckout",
  "https://stripe.faithdiscipline.org.uk/stripe-checkout.php"
);
safeMount(
  "/getAllPayments",
  "https://stripe.faithdiscipline.org.uk/Payments_APIs/get_all_payments.php"
);
safeMount(
  "/editPayment",
  "https://stripe.faithdiscipline.org.uk/Payments_APIs/edit_payments.php"
);

// --- Admin Login API ---
safeMount("/adminLogin", "https://stripe.faithdiscipline.org.uk/login.php");

// ---- Health ----
app.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// ---- Start ----
app.listen(config.port, () => {
  console.log(`✅ Gateway running on http://localhost:${config.port}`);
});
