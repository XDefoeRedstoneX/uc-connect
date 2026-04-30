import { existsSync, readFileSync } from "fs";
import { join } from "path";

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
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

if (missingKeys.length > 0) {
  console.error(`Missing required env vars in .env.local: ${missingKeys.join(", ")}`);
  console.error("Copy .env.example to .env.local and add your hosted Supabase project values.");
  process.exit(1);
}

console.log("Supabase env check passed.");