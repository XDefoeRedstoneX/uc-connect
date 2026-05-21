begin;

truncate table public.forum_replies, public.forum_threads, public.forum_categories, public.favorites, public.vendor_items, public.vendor_hours, public.vendor_metrics, public.vendors restart identity cascade;

insert into public.forum_categories (id, name, slug, description, created_at) values
('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'General Discussion', 'general-discussion', 'Talk about campus life, news, and everyday topics.', now()),
('22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Looking for Team', 'looking-for-team', 'Find partners for projects, competitions, and businesses.', now()),
('33333333-cccc-cccc-cccc-cccccccccccc', 'Vendor Q&A', 'vendor-qa', 'Ask questions, review vendors, and share recommendations.', now()),
('44444444-dddd-dddd-dddd-dddddddddddd', 'Buy & Sell', 'buy-sell', 'Second-hand textbooks, preloved items, and campus thrifting.', now());

commit;
