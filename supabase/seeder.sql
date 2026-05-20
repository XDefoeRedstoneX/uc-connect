begin;

truncate table public.forum_replies, public.forum_threads, public.forum_categories, public.favorites, public.vendor_items, public.vendor_hours, public.vendor_metrics, public.vendors restart identity cascade;

insert into public.vendors (
  id,
  owner_id,
  slug,
  name,
  tagline,
  category,
  city,
  description,
  whatsapp,
  website_url,
  hero_image_url,
  is_verified,
  created_at,
  updated_at
) values
(
  '11111111-1111-1111-1111-111111111111',
  null,
  'bite-bliss-bakery',
  'Bite & Bliss Bakery',
  'Fresh bakes for campus mornings',
  'Food & Beverage',
  'Surabaya',
  'Homemade breads, mini cakes, and dessert boxes for campus events, gifting, and everyday cravings.',
  '+6281234567890',
  null,
  '/images/vendor-placeholder.svg',
  true,
  now(),
  now()
),
(
  '22222222-2222-2222-2222-222222222222',
  null,
  'pixel-event-creative',
  'Pixel Event Creative',
  'Event visuals and branding made simple',
  'Creative Services',
  'Bandung',
  'Design support for posters, booths, social media, and campus event branding with quick turnaround.',
  '+6281234567891',
  null,
  '/images/vendor-placeholder.svg',
  true,
  now(),
  now()
),
(
  '33333333-3333-3333-3333-333333333333',
  null,
  'maju-print-corner',
  'Maju Print Corner',
  'Printing and binding for student needs',
  'Daily Essentials',
  'Malang',
  'Affordable print, copy, laminate, and binding services for assignments, posters, and mini projects.',
  '+6281234567892',
  null,
  '/images/vendor-placeholder.svg',
  true,
  now(),
  now()
),
(
  '44444444-4444-4444-4444-444444444444',
  null,
  'campus-fresh-bites',
  'Campus Fresh Bites',
  'Healthy rice bowls and snack packs',
  'Food & Beverage',
  'Yogyakarta',
  'Balanced meals and snack packs for events, study groups, and daily lunch deliveries around campus.',
  '+6281234567893',
  null,
  '/images/vendor-placeholder.svg',
  false,
  now(),
  now()
);

insert into public.vendor_metrics (vendor_id, sample_rating, response_rate, avg_reply_time, review_count, updated_at) values
('11111111-1111-1111-1111-111111111111', 4.90, 98.00, 'Under 2 hours', 152, now()),
('22222222-2222-2222-2222-222222222222', 4.80, 96.00, 'Under 4 hours', 118, now()),
('33333333-3333-3333-3333-333333333333', 4.70, 94.00, 'Under 3 hours', 84, now()),
('44444444-4444-4444-4444-444444444444', 4.60, 91.00, 'Same day', 67, now());

insert into public.vendor_hours (vendor_id, day_of_week, opens_at, closes_at, is_closed, notes) values
('11111111-1111-1111-1111-111111111111', 0, null, null, true, 'Closed on Sunday'),
('11111111-1111-1111-1111-111111111111', 1, '08:00', '20:00', false, null),
('11111111-1111-1111-1111-111111111111', 2, '08:00', '20:00', false, null),
('11111111-1111-1111-1111-111111111111', 3, '08:00', '20:00', false, null),
('11111111-1111-1111-1111-111111111111', 4, '08:00', '20:00', false, null),
('11111111-1111-1111-1111-111111111111', 5, '08:00', '20:00', false, null),
('11111111-1111-1111-1111-111111111111', 6, '09:00', '17:00', false, 'Weekend pickup available'),
('22222222-2222-2222-2222-222222222222', 0, null, null, true, 'Closed on Sunday'),
('22222222-2222-2222-2222-222222222222', 1, '09:00', '18:00', false, null),
('22222222-2222-2222-2222-222222222222', 2, '09:00', '18:00', false, null),
('22222222-2222-2222-2222-222222222222', 3, '09:00', '18:00', false, null),
('22222222-2222-2222-2222-222222222222', 4, '09:00', '18:00', false, null),
('22222222-2222-2222-2222-222222222222', 5, '09:00', '18:00', false, null),
('22222222-2222-2222-2222-222222222222', 6, '10:00', '14:00', false, 'Weekend express slot'),
('33333333-3333-3333-3333-333333333333', 0, null, null, true, 'Closed on Sunday'),
('33333333-3333-3333-3333-333333333333', 1, '08:30', '19:00', false, null),
('33333333-3333-3333-3333-333333333333', 2, '08:30', '19:00', false, null),
('33333333-3333-3333-3333-333333333333', 3, '08:30', '19:00', false, null),
('33333333-3333-3333-3333-333333333333', 4, '08:30', '19:00', false, null),
('33333333-3333-3333-3333-333333333333', 5, '08:30', '19:00', false, null),
('33333333-3333-3333-3333-333333333333', 6, '09:00', '15:00', false, 'Pickup and delivery available'),
('44444444-4444-4444-4444-444444444444', 0, '10:00', '15:00', false, 'Sunday brunch window'),
('44444444-4444-4444-4444-444444444444', 1, '08:00', '19:00', false, null),
('44444444-4444-4444-4444-444444444444', 2, '08:00', '19:00', false, null),
('44444444-4444-4444-4444-444444444444', 3, '08:00', '19:00', false, null),
('44444444-4444-4444-4444-444444444444', 4, '08:00', '19:00', false, null),
('44444444-4444-4444-4444-444444444444', 5, '08:00', '19:00', false, null),
('44444444-4444-4444-4444-444444444444', 6, '09:00', '14:00', false, 'Weekend takeaway menu');

insert into public.vendor_items (vendor_id, item_type, name, description, price, currency, image_url, sort_order, is_active, created_at) values
('11111111-1111-1111-1111-111111111111', 'menu', 'Campus Breakfast Bundle', 'Croissant, coffee, and fruit cup for morning classes.', 45000, 'IDR', '/images/vendor-placeholder.svg', 1, true, now()),
('11111111-1111-1111-1111-111111111111', 'menu', 'Strawberry Croissant Box', 'A box of 6 buttery croissants with strawberry glaze.', 35000, 'IDR', '/images/vendor-placeholder.svg', 2, true, now()),
('11111111-1111-1111-1111-111111111111', 'service', 'Custom Celebration Cake', 'Birthday and graduation cakes with simple custom writing.', 150000, 'IDR', '/images/vendor-placeholder.svg', 3, true, now()),
('11111111-1111-1111-1111-111111111111', 'service', 'Dessert Table Package', 'Mini cakes, brownies, and cookies for event catering.', 650000, 'IDR', '/images/vendor-placeholder.svg', 4, true, now()),
('22222222-2222-2222-2222-222222222222', 'service', 'Campus Event Poster Pack', 'Three poster layouts and social media banners.', 120000, 'IDR', '/images/vendor-placeholder.svg', 1, true, now()),
('22222222-2222-2222-2222-222222222222', 'service', 'Booth Branding Kit', 'Backdrop, signboard, and sticker assets for booths.', 250000, 'IDR', '/images/vendor-placeholder.svg', 2, true, now()),
('22222222-2222-2222-2222-222222222222', 'service', 'Social Media Launch Pack', 'Cover, post template, and story graphics bundle.', 90000, 'IDR', '/images/vendor-placeholder.svg', 3, true, now()),
('33333333-3333-3333-3333-333333333333', 'service', 'A4 Print and Copy', 'Black and white print and copy service per 10 pages.', 5000, 'IDR', '/images/vendor-placeholder.svg', 1, true, now()),
('33333333-3333-3333-3333-333333333333', 'service', 'Binding and Lamination', 'Comb binding and document lamination for reports.', 15000, 'IDR', '/images/vendor-placeholder.svg', 2, true, now()),
('33333333-3333-3333-3333-333333333333', 'product', 'Sticker Sheet Pack', 'Custom sticker sheet for event giveaways.', 25000, 'IDR', '/images/vendor-placeholder.svg', 3, true, now()),
('44444444-4444-4444-4444-444444444444', 'menu', 'Chicken Rice Bowl', 'Warm rice bowl with chicken, egg, and sesame dressing.', 38000, 'IDR', '/images/vendor-placeholder.svg', 1, true, now()),
('44444444-4444-4444-4444-444444444444', 'menu', 'Veggie Wrap Box', 'Fresh wrap with seasonal vegetables and yogurt dip.', 32000, 'IDR', '/images/vendor-placeholder.svg', 2, true, now()),
('44444444-4444-4444-4444-444444444444', 'service', 'Weekly Lunch Subscription', 'Five-day meal plan for students and small teams.', 160000, 'IDR', '/images/vendor-placeholder.svg', 3, true, now());

insert into public.forum_categories (id, name, slug, description, created_at) values
('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'General Discussion', 'general-discussion', 'Talk about campus life, news, and everyday topics.', now()),
('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Looking for Team', 'looking-for-team', 'Find partners for projects, competitions, and businesses.', now()),
('33333333-cccc-cccc-cccc-cccccccccccc', 'Vendor Q&A', 'vendor-qa', 'Ask questions, review vendors, and share recommendations.', now()),
('44444444-dddd-dddd-dddd-dddddddddddd', 'Buy & Sell', 'buy-sell', 'Second-hand textbooks, preloved items, and campus thrifting.', now());

commit;
