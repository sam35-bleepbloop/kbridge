// ============================================================
// components/layout/AdminSidebar.tsx — ADD THESE NAV ITEMS
//
// Find your existing navItems array and add these two entries.
// Suggested position: after "Price References", before any
// settings items at the bottom.
// ============================================================

// ADD to navItems array:
{
  href: "/admin/pricing-rules",
  label: "Token Pricing",
  // icon: use whatever icon component you're using — e.g. CurrencyDollarIcon or TagIcon
},
{
  href: "/admin/pioneer-tasks",
  label: "Pioneer Tasks",
  // Add a badge showing unreviewed pioneer task count if you want (Phase 2 enhancement)
  // For now, a static nav item is fine.
},

// ============================================================
// OPTIONAL: Pioneer Tasks badge (unreviewed count)
// If you want to show a count badge on the nav item,
// fetch /api/admin/pioneer-tasks in the sidebar and show
// tasks.length as a badge. Not required for this session.
// ============================================================
