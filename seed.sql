INSERT INTO vendors (slug, name, category, distance_km, rating, verified, image_url, summary, featured_rank) VALUES
('bite-bliss-bakery', 'Bite & Bliss Bakery', 'Food & Beverage', 5, 4.9, 1, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTDftmU3isio0oWqtsO7pKK-35uu_XbtgEgEffX_pG_rS1DNcGLVBLRIQ1hXLDlyahvGvTijqhBd2RtttnNWB9UPpsE23p7RvElScIM0CErCzPe-Ny9mutWHLsYRIBlE8CNqp9fF6q0sZEV35o5KHveCKl3sytXEZVZHOXRRUC3muRpsHe1JaAup46F4km0wZ7ndjOnbwcRD8KzzBNCsYLR9ka_Zy4yFiJwZFgeCfoCDQvlPwXZNYsesWtcDFTQDDSu9WEgDwmCCqe', 'Artisan breads, pastries, and campus delivery.', 1),
('frame-focus-studio', 'Frame Focus Studio', 'Creative Services', 2, 4.8, 1, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCZfh4_G3IgXViDkSTnuWoaqsrS3xWbMzaICo1zdhmWz5Vv0rFFwOTKFQy7I1h08xnH-RmIVXmFtMIyhx8SFPNdkfE3b_7hjZsJ4o1aC1HxNihk8V-_YsR65miQsF4VHBWscD0zbasN6ZyWldA0ybI7witiDMWMcZAmSAqAxBs2vP7rfopNI1b6UNcUDkafmgc3pw9F1zsL3w8tzzriDw9RfZlsqsgtHFz-qCx2n8YKrzGOMS0N2mOzYfPqC8I4iJ2VSvNojZZT2G-', 'Photography, branding, and content packages.', 2),
('bloom-events', 'Bloom Events', 'Event Needs', 4, 5.0, 1, 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj6vDT4irxO3rvsTjy9rP4A6qFtT1VkIvyEGfpUUXh3NmEFe_w7GRpYLq-XWu0jRUzZNEIW9HZwyv2YhesopntAnSygvkOGyp7YsBl1NIRcOot6EH5TN3pXm22dEKlVVqPbY1Q4ok0BW_dxE5p_IM5xSXkm_Cgsmfe4KV8GFcIF4YLtUdD7ZNknS8-np6SDj1ukEHhDmJ22pQ-W-ylTdu_siLfawdKjPiXNsHpS8SlpWSS-hXHKnvF-aVlGnJofCnICNcxNm_XfB83', 'Graduation, birthday, and campus event packages.', 3),
('daily-dose-cafe', 'Daily Dose Cafe', 'Daily Essentials', 1, 4.7, 1, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxjB6IDz0VrZGx_nje5WnW-rWR8dftq1onRdwr-EI5XbDmqNAa1G3HcJge5mkIyvjiiyaMylIj_2hwKFx5Q_j3Qax6ZT52FvISZXAd2Gtn_bZnAw2JbpeXwoTeekjJufcV2NtuUjRkUFMoDDGrhb3FyQfo1dgSe1_Di9J_bkDMJf38exPqHb9RYnr2n0AlCjsNSsfmw2iejSxrro7htB4HoKoM9xy4SffzLdkJh_tEnlJl0X4Xaawf0i54-5JSQkJ45PY6BJrSiTtG', 'Coffee, brunch, and daily student essentials.', 4)
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

INSERT INTO users (full_name, email, phone, password_hash, role, city) VALUES
('Ibu Anita', 'ibu.anita@example.com', NULL, '', 'customer', 'Surabaya Barat')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO forum_threads (title, author, replies, likes, category, excerpt) VALUES
('Mencari Jasa Desain Grafis Cepat untuk Ulang Tahun Anak', 'Ibu Anita', 4, 24, 'Mencari Jasa', 'Butuh bantuan banner dan undangan digital untuk ulang tahun anak minggu depan.'),
('Rekomendasi Tempat Print 24 Jam di Sekitar UNESA', 'Budi Santoso', 8, 12, 'Tanya Jawab', 'Cari tempat print yang buka sampai dini hari di daerah Lidah Wetan atau Babatan.'),
('Vendor katering sehat untuk event kampus', 'Siska P.', 6, 19, 'Rekomendasi Warga', 'Mencari katering sehat untuk acara komunitas dengan budget mahasiswa.')
ON DUPLICATE KEY UPDATE title = VALUES(title);