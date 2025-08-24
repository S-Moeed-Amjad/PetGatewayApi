// gateway.js (CommonJS)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = require("./env");
const app = express();

app.use(cors());
// NOTE: If you need multipart/form-data (file uploads), do NOT parse body globally.
// Keep these for JSON/forms only:
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
// Helper to mount a proxy (prefix -> targetBaseOrEndpoint)
// Example: mount("/getAllPets", base + "all")  => /getAllPets -> .../all
//          mount("/getPetById", base)          => /getPetById/5 -> .../5
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
      pathRewrite: pathRewriteMap,
      proxyTimeout: 5000,

      // Ensure POST/PUT/PATCH bodies reach the upstream
      onProxyReq: (proxyReq, req) => {
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
      },

      onProxyRes: (proxyRes, req) => {
        if (proxyRes.statusCode === 429) {
          console.warn(
            `[UPSTREAM 429] ${target} <- ${req.method} ${req.originalUrl}`
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

// ---- Upstream bases (from env.js) ----
const petBase = config.services.PetAdoptionServices; // expects trailing slash in .env
const medHost = "https://medication-service.onrender.com"; // Python service base

// --- Pet Adoption endpoints (per your style) ---
safeMount("/getAllPets", petBase + "all");
safeMount("/addPet", petBase + "add");
safeMount("/getPetById", petBase); // /getPetById/5 -> .../api/Pet/5
safeMount("/getAllAdoptions", petBase + "adoptions");
safeMount("/getAllReturns", petBase + "unadoptions");
safeMount("/getImagesById", petBase + "images");
safeMount("/AdoptPet", petBase + "adopt");
safeMount("/ReturnPet", petBase + "unadopt");
safeMount("/Reserve", petBase + "reserve");
safeMount("/Vacant", petBase + "vacant");
safeMount("/addImages", petBase + "add-images");

// Swagger: mount the whole /swagger prefix so assets load
safeMount("/swagger", "https://petadoptionwebapi-1.onrender.com/swagger");

// --- Treatment services (fix Flask-style placeholders) ---
// Use clean prefixes; the tail path (like /123) will be forwarded as-is:
safeMount("/add-treatment", `${medHost}/add-treatments`); // POST
safeMount("/all-treatments", `${medHost}/all-treatments`); // GET
safeMount("/treatments", `${medHost}/treatments`); // GET /treatments/:pet_id
safeMount("/treatment", `${medHost}/treatment`); // PUT /treatment/:id
safeMount("/update-treatment", `${medHost}/update-treatment`); // PUT /update-treatment/:id
safeMount("/delete-treatment", `${medHost}/delete-treatment`); // DELETE /delete-treatment/:id

// --- Other services ---
safeMount("/orders", config.services.orders);
safeMount("/ml", config.services.ml);

// --- Payment APIs ---
safeMount(
  "/stripeCheckout",
  "https://stripe.faithdiscipline.org.uk/stripe-checkout.php"
); // POST
safeMount(
  "/getAllPayments",
  "https://stripe.faithdiscipline.org.uk/Payments_APIs/get_all_payments.php"
); // GET
safeMount(
  "/editPayment",
  "https://stripe.faithdiscipline.org.uk/Payments_APIs/edit_payments.php"
); // POST

// --- Admin Login API ---
safeMount("/adminLogin", "https://stripe.faithdiscipline.org.uk/login.php"); // POST

// --- User API ---
// If env.js doesn't define userApi, read from env and mount only those provided.
const userApi = config.userApi ?? {
  base: process.env.USER_API_BASE,
  login: process.env.USER_API_LOGIN,
  forgotPassword: process.env.USER_API_FORGOT_PASSWORD,
  verifyOtp: process.env.USER_API_VERIFY_OTP,
  resetPassword: process.env.USER_API_RESET_PASSWORD,
  oneUserData: process.env.USER_API_ONE_USER_DATA,
  byId: process.env.USER_API_BY_ID,
  deleteUser: process.env.USER_API_DELETE_USER,
  deleteById: process.env.USER_API_DELETE_BY_ID,
  getAllUsers: process.env.USER_API_GET_ALL,
  getAllUsersId: process.env.USER_API_GET_ALL_IDS,
};

safeMount("/users", userApi.base);
safeMount("/users/login", userApi.login);
safeMount("/users/forgot-password", userApi.forgotPassword);
safeMount("/users/verify-otp", userApi.verifyOtp);
safeMount("/users/reset-password", userApi.resetPassword);
safeMount("/users/one-user-data", userApi.oneUserData); // call as /users/one-user-data/:email
safeMount("/users/by-id", userApi.byId); // call as /users/by-id/:id
safeMount("/users/delete-user", userApi.deleteUser); // call as /users/delete-user/:email
safeMount("/users/delete-by-id", userApi.deleteById); // call as /users/delete-by-id/:id
safeMount("/users/get-all-users", userApi.getAllUsers);
safeMount("/users/get-all-users-id", userApi.getAllUsersId);

// ---- Health ----
app.get("/health", (_, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// ---- Start ----
app.listen(config.port, () => {
  console.log(`✅ Gateway running on http://localhost:${config.port}`);
  console.log("Routes:");
  console.log(`  /getAllPets           -> ${petBase}all`);
  console.log(`  /addPet               -> ${petBase}add`);
  console.log(`  /getPetById/:id       -> ${petBase}{id}`);
  console.log(
    `  /swagger/*            -> https://petadoptionwebapi-1.onrender.com/swagger/*`
  );
  console.log(`  /treatments/:pet_id   -> ${medHost}/treatments/:pet_id`);
  console.log(`  /treatment/:id        -> ${medHost}/treatment/:id`);
  console.log(`  /update-treatment/:id -> ${medHost}/update-treatment/:id`);
  console.log(`  /delete-treatment/:id -> ${medHost}/delete-treatment/:id`);
});
