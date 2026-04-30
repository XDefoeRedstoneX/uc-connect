import { copyFileSync, existsSync } from "fs";
import { join } from "path";

const sourcePath = join(process.cwd(), ".env.example");
const targetPath = join(process.cwd(), ".env.local");

if (existsSync(targetPath)) {
  console.log(".env.local already exists.");
  process.exit(0);
}

copyFileSync(sourcePath, targetPath);
console.log("Created .env.local from .env.example. Fill in your Supabase values before running dev or build.");