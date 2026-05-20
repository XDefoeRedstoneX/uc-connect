import { existsSync, readFileSync } from "fs";
import { join } from "path";

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
];

const envPath = join(process.cwd(), ".env.local");

function parseEnvFile(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    values[key] = value;
  }
  return values;
}

if (!existsSync(envPath)) {
  console.error("Missing .env.local. Create it from .env.example and fill in your Supabase values.");
  process.exit(1);
}

const envValues = parseEnvFile(readFileSync(envPath, "utf8"));
const missingKeys = requiredKeys.filter((key) => !envValues[key]);
const publicKeyPresent = Boolean(envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY || envValues.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

if (!publicKeyPresent) {
  missingKeys.push("NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

if (missingKeys.length > 0) {
  console.error(`Missing required env vars in .env.local: ${missingKeys.join(", ")}`);
  console.error("Copy .env.example to .env.local and add your hosted Supabase project values.");
  process.exit(1);
}

if (!envValues.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is not set. API routes will use public key fallback.");
}

if (!envValues.MIDTRANS_SERVER_KEY || !envValues.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
  console.warn(
    "Midtrans keys missing (MIDTRANS_SERVER_KEY / NEXT_PUBLIC_MIDTRANS_CLIENT_KEY). " +
    "Wallet top-up + featured bidding will be disabled until they are set.",
  );
}

console.log("Supabase env check passed.");
