export type Vendor = {
  id: string;
  name: string;
  slug?: string;
  tagline?: string | null;
  category: string | null;
  city: string | null;
  is_verified: boolean;
  description: string | null;
  whatsapp: string | null;
  website_url?: string | null;
  hero_image_url?: string | null;
  university?: string | null;
  sales_system?: string | null;
  delivery_methods?: string | null;
  ktm_url?: string | null;
  created_at: string;
};

export type VendorMetric = {
  sample_rating: number;
  response_rate: number;
  avg_reply_time: string;
  review_count: number;
  updated_at: string;
};

export type VendorHour = {
  id: string;
  vendor_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  notes: string | null;
};

export type VendorItem = {
  id: string;
  vendor_id: string;
  item_type: "menu" | "service" | "product";
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type VendorDetail = Vendor & {
  tagline: string | null;
  website_url: string | null;
  hero_image_url: string | null;
  metrics: VendorMetric | null;
  hours: VendorHour[];
  items: VendorItem[];
};

export type UserProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "customer" | "vendor" | "admin";
  updated_at: string;
};

export type ForumCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type ForumThread = {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  image_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  forum_replies?: { count: number }[];
};

export type ForumReply = {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

export type VendorReview = {
  id: string;
  vendor_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};
