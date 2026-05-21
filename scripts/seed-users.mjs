#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// scripts/seed-users.mjs
//
// Seeds three baseline accounts so a fresh DB has someone to log in as:
//   • admin@ucconnect.test    (role=admin)
//   • vendor@ucconnect.test   (role=vendor, owner of the first seeded vendor)
//   • customer@ucconnect.test (role=customer)
//
// Idempotent: re-running skips users that already exist by email.
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
//
//   npm run seed:users
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import ws from "ws";

const ENV_PATH = join(process.cwd(), ".env.local");

function parseEnvFile(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return values;
}

if (!existsSync(ENV_PATH)) {
  console.error("Missing .env.local. Run `npm run setup:env` first.");
  process.exit(1);
}

const env = parseEnvFile(readFileSync(ENV_PATH, "utf8"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

const PASSWORD = "asdasdasd";

const USERS = [
  { email: "admin@asd.asd",    role: "admin",    fullName: "UC Connect Admin",    username: "admin" },
  { email: "vendor@asd.asd",   role: "vendor",   fullName: "Demo Vendor Owner",   username: "demo_vendor" },
  { email: "customer@asd.asd", role: "customer", fullName: "Demo Customer",       username: "demo_customer" },
];

async function findUserByEmail(email) {
  // listUsers paginates; for a seed script we just scan the first page (1000 users).
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureUser({ email, role, fullName, username }) {
  let user = await findUserByEmail(email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, username },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  created ${email}`);
  } else {
    console.log(`  exists  ${email}`);
  }

  // Upsert profile with the right role (handle_new_user trigger creates customer by default).
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      username,
      full_name: fullName,
      role,
      updated_at: new Date().toISOString(),
    });
  if (profileError) throw profileError;

  return user;
}

async function attachVendorOwner(vendorUserId) {
  // Find the first seeded vendor without an owner and link it.
  const { data: orphan, error: findError } = await supabase
    .from("vendors")
    .select("id, name")
    .is("owner_id", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (!orphan) {
    console.log("  no orphan vendor row to attach — skipping ownership link");
    return;
  }

  const { error: updateError } = await supabase
    .from("vendors")
    .update({ owner_id: vendorUserId })
    .eq("id", orphan.id);
  if (updateError) throw updateError;

  console.log(`  linked vendor "${orphan.name}" → vendor@ucconnect.test`);
}

async function seedForum(customerId, vendorId) {
  // Categories come from seeder.sql; pick the first one to attach threads to.
  const { data: category } = await supabase
    .from("forum_categories")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!category) {
    console.log("  no forum category found — run seeder.sql first, skipping forum seed");
    return;
  }

  // Idempotent: skip if any thread already exists.
  const { count } = await supabase
    .from("forum_threads")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    console.log("  forum already has threads — skipping forum seed");
    return;
  }

  const { data: thread, error: threadError } = await supabase
    .from("forum_threads")
    .insert({
      category_id: category.id,
      author_id: customerId,
      title: "Rekomendasi vendor makanan dekat kampus?",
      content: "Halo semua! Lagi cari vendor makanan mahasiswa yang enak dan ramah kantong. Ada rekomendasi?",
    })
    .select("id")
    .single();
  if (threadError) throw threadError;

  await supabase.from("forum_replies").insert([
    { thread_id: thread.id, author_id: vendorId, content: "Mampir ke toko kami ya, ada paket hemat untuk anak kos!" },
    { thread_id: thread.id, author_id: customerId, content: "Makasih, langsung cek!" },
  ]);

  console.log("  seeded 1 forum thread + 2 replies");
}

(async () => {
  console.log(`Seeding users against ${url}\n`);
  const created = {};
  for (const def of USERS) {
    created[def.role] = await ensureUser(def);
  }

  if (created.vendor) {
    await attachVendorOwner(created.vendor.id);
  }

  if (created.customer && created.vendor) {
    await seedForum(created.customer.id, created.vendor.id);
  }

  console.log("\n✓ Seed complete. Default password for all three accounts: " + PASSWORD);
})().catch((err) => {
  console.error("\nseed-users failed:", err.message || err);
  process.exit(1);
});
