// prisma/seed.ts
// Run with: npx ts-node prisma/seed.ts
// Or add to package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
// Then run: npx prisma db seed

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding K-Bridge database…");

  // ── Price references ───────────────────────────────────────────────────────
  // Based on typical Camp Humphreys area prices — update regularly
  const priceRefs = [
    // Cleaning
    { category: "cleaning", subCategory: "studio_1br",   lowKrw: 50000,  highKrw: 80000,  confidence: "MEDIUM" as const, source: "Market research Q1 2025" },
    { category: "cleaning", subCategory: "apartment_2br", lowKrw: 70000,  highKrw: 120000, confidence: "MEDIUM" as const, source: "Market research Q1 2025" },
    { category: "cleaning", subCategory: "apartment_3br", lowKrw: 100000, highKrw: 160000, confidence: "MEDIUM" as const, source: "Market research Q1 2025" },
    { category: "cleaning", subCategory: "house_large",   lowKrw: 150000, highKrw: 250000, confidence: "LOW"    as const, source: "Market research Q1 2025" },

    // Rent (Pyeongtaek / Humphreys area)
    { category: "rent", subCategory: "offpost_studio",   lowKrw: 400000,  highKrw: 700000,  confidence: "MEDIUM" as const, source: "Community reports 2025" },
    { category: "rent", subCategory: "offpost_apartment", lowKrw: 700000,  highKrw: 1200000, confidence: "MEDIUM" as const, source: "Community reports 2025" },
    { category: "rent", subCategory: "offpost_house",     lowKrw: 1000000, highKrw: 2000000, confidence: "LOW"    as const, source: "Community reports 2025" },

    // Daycare
    { category: "daycare", subCategory: "monthly_full",  lowKrw: 300000, highKrw: 600000, confidence: "MEDIUM" as const, source: "Community reports 2025" },
    { category: "daycare", subCategory: "monthly_part",  lowKrw: 150000, highKrw: 350000, confidence: "LOW"    as const, source: "Community reports 2025" },

    // Utilities
    { category: "utility", subCategory: "electric_monthly", lowKrw: 30000,  highKrw: 80000,  confidence: "HIGH"   as const, source: "KEPCO rate tables 2025" },
    { category: "utility", subCategory: "gas_monthly",      lowKrw: 20000,  highKrw: 60000,  confidence: "MEDIUM" as const, source: "Market research 2025" },
    { category: "utility", subCategory: "water_monthly",    lowKrw: 10000,  highKrw: 30000,  confidence: "HIGH"   as const, source: "City utility rates 2025" },

    // Phone (Korean carriers)
    { category: "phone", subCategory: "lte_unlimited",  lowKrw: 40000, highKrw: 70000, confidence: "HIGH" as const, source: "SKT/KT/LGU+ published plans 2025" },
    { category: "phone", subCategory: "5g_unlimited",   lowKrw: 55000, highKrw: 95000, confidence: "HIGH" as const, source: "SKT/KT/LGU+ published plans 2025" },

    // Traffic tickets
    { category: "traffic", subCategory: "speed_minor",    lowKrw: 30000,  highKrw: 60000,  confidence: "HIGH" as const, source: "Korean traffic law schedule" },
    { category: "traffic", subCategory: "speed_major",    lowKrw: 60000,  highKrw: 150000, confidence: "HIGH" as const, source: "Korean traffic law schedule" },
    { category: "traffic", subCategory: "red_light",      lowKrw: 70000,  highKrw: 130000, confidence: "HIGH" as const, source: "Korean traffic law schedule" },
    { category: "traffic", subCategory: "no_parking",     lowKrw: 40000,  highKrw: 80000,  confidence: "HIGH" as const, source: "Korean traffic law schedule" },

    // Attractions
    { category: "attraction", subCategory: "everland_adult",  lowKrw: 54000, highKrw: 62000, confidence: "HIGH" as const, source: "Everland official pricing 2025" },
    { category: "attraction", subCategory: "everland_child",  lowKrw: 43000, highKrw: 50000, confidence: "HIGH" as const, source: "Everland official pricing 2025" },
    { category: "attraction", subCategory: "lotte_world_adult", lowKrw: 56000, highKrw: 62000, confidence: "HIGH" as const, source: "Lotte World official pricing 2025" },
  ];

  for (const ref of priceRefs) {
    await db.priceReference.upsert({
      where:  { category_subCategory: { category: ref.category, subCategory: ref.subCategory } },
      update: { ...ref, lastUpdatedAt: new Date() },
      create: { ...ref },
    });
  }
  console.log(`✓ Seeded ${priceRefs.length} price references`);

  // ── Default admin employee ─────────────────────────────────────────────────
  // Change this email to the actual admin's email before running
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@kbridge.com";
  await db.employee.upsert({
    where:  { email: adminEmail },
    update: {},
    create: {
      name:     "K-Bridge Admin",
      email:    adminEmail,
      role:     "ADMIN",
      isActive: true,
    },
  });
  console.log(`✓ Admin employee created: ${adminEmail}`);

  console.log("\nSeeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
