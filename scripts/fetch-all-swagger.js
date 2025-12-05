#!/usr/bin/env node

/**
 * Script to fetch Swagger JSON from all services
 * Usage: node scripts/fetch-all-swagger.js [output-dir]
 */

const https = require("http");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = process.argv[2] || "swagger-json";
const BASE_URL = process.env.BASE_URL || "http://localhost";

// Service configurations: name:port
const SERVICES = {
  "api-gateway": 3000,
  "auth-service": 3001,
  "user-service": 3002,
  "entity-service": 3003,
  "subscription-service": 3004,
  "manager-service": 3005,
  "employee-service": 3006,
  "menu-service": 3007,
  "order-service": 3008,
  "payment-service": 3009,
  "receipt-service": 3010,
  "notification-service": 3011,
  "audit-service": 3012,
  "report-service": 3013,
};

// Swagger JSON endpoint (NestJS standard)
const JSON_ENDPOINT = "/api/docs-json";

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("🔍 Fetching Swagger JSON from all services...");
console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

let successCount = 0;
let failedCount = 0;
const failedServices = [];

/**
 * Fetch data from URL
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            // Validate JSON
            JSON.parse(data);
            resolve(data);
          } catch (e) {
            reject(new Error("Invalid JSON response"));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

/**
 * Fetch Swagger JSON for a service
 */
async function fetchSwagger(serviceName, port) {
  process.stdout.write(`  Fetching ${serviceName} (port ${port})... `);

  const url = `${BASE_URL}:${port}${JSON_ENDPOINT}`;
  const outputFile = path.join(OUTPUT_DIR, `${serviceName}.json`);

  try {
    const data = await fetchUrl(url);
    fs.writeFileSync(outputFile, data, "utf8");
    console.log("✅");
    successCount++;
    return true;
  } catch (err) {
    console.log("❌ Failed");
    failedCount++;
    failedServices.push(serviceName);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const promises = Object.entries(SERVICES).map(([name, port]) =>
    fetchSwagger(name, port)
  );

  await Promise.all(promises);

  console.log("\n==========================================");
  console.log("📊 Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}\n`);

  if (failedCount > 0) {
    console.log("⚠️  Failed services:");
    failedServices.forEach((service) => {
      console.log(`   - ${service}`);
    });
    console.log("\n💡 Make sure all services are running:");
    console.log("   docker ps | grep billme");
    console.log("   or");
    console.log("   npm run start:all\n");
  }

  if (successCount > 0) {
    console.log(`✅ Swagger JSON files saved to: ${OUTPUT_DIR}/\n`);
    console.log("📄 Files created:");

    const files = fs
      .readdirSync(OUTPUT_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const filePath = path.join(OUTPUT_DIR, f);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        return `   - ${f} (${size} KB)`;
      });

    files.forEach((file) => console.log(file));

    // Create merged file
    console.log("\n🔄 Creating merged swagger file...");
    const mergedFile = path.join(OUTPUT_DIR, "all-services-merged.json");
    const merged = {};

    const jsonFiles = fs
      .readdirSync(OUTPUT_DIR)
      .filter((f) => f.endsWith(".json") && f !== "all-services-merged.json");

    jsonFiles.forEach((file) => {
      const filePath = path.join(OUTPUT_DIR, file);
      const serviceName = path.basename(file, ".json");
      try {
        const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
        merged[serviceName] = content;
      } catch (err) {
        console.error(`   ⚠️  Error reading ${file}: ${err.message}`);
      }
    });

    fs.writeFileSync(mergedFile, JSON.stringify(merged, null, 2), "utf8");
    const mergedSize = (fs.statSync(mergedFile).size / 1024).toFixed(2);
    console.log(`✅ Merged file created: ${mergedFile} (${mergedSize} KB)`);
  }

  console.log("\n✨ Done!");
}

// Run
main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
