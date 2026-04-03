// ============================================================
// prisma/seed.ts — ADD THIS BLOCK
// Initial TaskPricingRule seed data
// Add this to the bottom of your existing seed.ts file,
// inside the main() function.
// ============================================================

// Initial pricing rules — known one-off task categories at launch
const pricingRules = [
  {
    category: "Traffic Ticket Payment",
    tokenCost: 4,
    description: "Standard traffic/parking fine payment via Korean online portal",
  },
  {
    category: "Utility Bill Payment",
    tokenCost: 3,
    description: "One-off utility bill (electricity, gas, water) not on recurring schedule",
  },
  {
    category: "Airport Transfer Booking",
    tokenCost: 3,
    description: "Arranging transport between airport and base or residence",
  },
  {
    category: "Food Delivery Order",
    tokenCost: 2,
    description: "Korean food delivery platforms (Baemin, Coupang Eats)",
  },
  {
    category: "Restaurant Reservation",
    tokenCost: 2,
    description: "Making a reservation at a Korean restaurant on the user's behalf",
  },
  {
    category: "Package Delivery Coordination",
    tokenCost: 3,
    description: "Coordinating Korean domestic delivery (CJ Logistics, Lotte, etc.)",
  },
  {
    category: "Vehicle Registration",
    tokenCost: 5,
    description: "Assisting with Korean vehicle registration or insurance paperwork",
  },
  {
    category: "Medical Appointment Booking",
    tokenCost: 4,
    description: "Booking a medical or dental appointment at a Korean clinic",
  },
  {
    category: "Ticket Purchase",
    tokenCost: 3,
    description: "Event, attraction, or venue ticket purchase via Korean platform",
  },
  {
    category: "Government Document Assistance",
    tokenCost: 5,
    description: "Helping navigate Korean government forms or procedures",
  },
];

for (const rule of pricingRules) {
  await prisma.taskPricingRule.upsert({
    where: { category: rule.category },
    update: { tokenCost: rule.tokenCost, description: rule.description },
    create: rule,
  });
}

console.log(`✓ Seeded ${pricingRules.length} TaskPricingRule entries`);

// ============================================================
// END OF SEED ADDITIONS
// ============================================================
