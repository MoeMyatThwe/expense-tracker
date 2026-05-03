export interface CategoryOption {
  id?: string;
  name: string;
  icon: string;
}

const CATEGORY_IMAGE_BASE = "/assets/cinamoroll_theme/Category";

export const CATEGORY_ICONS = [
  `${CATEGORY_IMAGE_BASE}/Entertainment.png`,
  `${CATEGORY_IMAGE_BASE}/Family.png`,
  `${CATEGORY_IMAGE_BASE}/Food.png`,
  `${CATEGORY_IMAGE_BASE}/GroceryShopping.png`,
  `${CATEGORY_IMAGE_BASE}/Health.png`,
  `${CATEGORY_IMAGE_BASE}/Pet.png`,
  `${CATEGORY_IMAGE_BASE}/PhoneBill.png`,
  `${CATEGORY_IMAGE_BASE}/Present.png`,
  `${CATEGORY_IMAGE_BASE}/School.png`,
  `${CATEGORY_IMAGE_BASE}/Shopping.png`,
  `${CATEGORY_IMAGE_BASE}/Transport.png`,
  `${CATEGORY_IMAGE_BASE}/Work.png`,
];

export const LEGACY_CATEGORY_ICON_MAP: Record<string, string> = {
  BookOpen: `${CATEGORY_IMAGE_BASE}/School.png`,
  Briefcase: `${CATEGORY_IMAGE_BASE}/Work.png`,
  Car: `${CATEGORY_IMAGE_BASE}/Activities.png`,
  Coffee: `${CATEGORY_IMAGE_BASE}/Food.png`,
  Gamepad2: `${CATEGORY_IMAGE_BASE}/Entertainment.png`,
  Gift: `${CATEGORY_IMAGE_BASE}/Present.png`,
  HeartPulse: `${CATEGORY_IMAGE_BASE}/Health.png`,
  House: `${CATEGORY_IMAGE_BASE}/Family.png`,
  Package: `${CATEGORY_IMAGE_BASE}/Activities.png`,
  Plane: `${CATEGORY_IMAGE_BASE}/Transport.png`,
  ReceiptText: `${CATEGORY_IMAGE_BASE}/PhoneBill.png`,
  ShoppingBag: `${CATEGORY_IMAGE_BASE}/Shopping.png`,
  ShoppingCart: `${CATEGORY_IMAGE_BASE}/GroceryShopping.png`,
  Sparkles: `${CATEGORY_IMAGE_BASE}/Entertainment.png`,
  Users: `${CATEGORY_IMAGE_BASE}/Family.png`,
  Utensils: `${CATEGORY_IMAGE_BASE}/Food.png`,
};

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { name: "food", icon: `${CATEGORY_IMAGE_BASE}/Food.png` },
  { name: "groceries", icon: `${CATEGORY_IMAGE_BASE}/GroceryShopping.png` },
  { name: "friends", icon: `${CATEGORY_IMAGE_BASE}/Family.png` },
  { name: "family", icon: `${CATEGORY_IMAGE_BASE}/Family.png` },
  { name: "transport", icon: `${CATEGORY_IMAGE_BASE}/Transport.png` },
  { name: "shopping", icon: `${CATEGORY_IMAGE_BASE}/Shopping.png` },
  { name: "entertainment", icon: `${CATEGORY_IMAGE_BASE}/Entertainment.png` },
  { name: "bills", icon: `${CATEGORY_IMAGE_BASE}/PhoneBill.png` },
  { name: "health", icon: `${CATEGORY_IMAGE_BASE}/Health.png` },
  { name: "other", icon: `${CATEGORY_IMAGE_BASE}/Activities.png` },
];

export const CATEGORY_NAME_ICON_MAP: Record<string, string> = Object.fromEntries(
  DEFAULT_CATEGORIES.map((category) => [category.name, category.icon]),
);

export function resolveCategoryIcon(icon?: string) {
  if (!icon) return `${CATEGORY_IMAGE_BASE}/Activities.png`;
  return (
    LEGACY_CATEGORY_ICON_MAP[icon] ||
    CATEGORY_NAME_ICON_MAP[icon.toLowerCase()] ||
    icon
  );
}

export function formatCategoryIconName(icon: string) {
  const filename = icon.split("/").pop() || icon;
  return filename.replace(/\.[^.]+$/, "");
}

export function formatCategoryName(name: string) {
  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
