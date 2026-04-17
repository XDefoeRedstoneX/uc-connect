const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const {
  query,
  isDatabaseReady,
  ensureSchema,
} = require('./db');
const { APP_ROUTES, LEGACY_ROUTE_REDIRECTS } = require('./routes');

const app = express();
const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const nodeEnv = process.env.NODE_ENV || 'development';
let startupPromise;

const fallbackVendors = [
  {
    id: 1,
    slug: 'bite-bliss-bakery',
    name: 'Bite & Bliss Bakery',
    category: 'Food & Beverage',
    distance_km: 5,
    rating: 4.9,
    verified: 1,
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTDftmU3isio0oWqtsO7pKK-35uu_XbtgEgEffX_pG_rS1DNcGLVBLRIQ1hXLDlyahvGvTijqhBd2RtttnNWB9UPpsE23p7RvElScIM0CErCzPe-Ny9mutWHLsYRIBlE8CNqp9fF6q0sZEV35o5KHveCKl3sytXEZVZHOXRRUC3muRpsHe1JaAup46F4km0wZ7ndjOnbwcRD8KzzBNCsYLR9ka_Zy4yFiJwZFgeCfoCDQvlPwXZNYsesWtcDFTQDDSu9WEgDwmCCqe',
    summary: 'Artisan breads, pastries, and campus delivery.',
  },
  {
    id: 2,
    slug: 'frame-focus-studio',
    name: 'Frame Focus Studio',
    category: 'Creative Services',
    distance_km: 2,
    rating: 4.8,
    verified: 1,
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCZfh4_G3IgXViDkSTnuWoaqsrS3xWbMzaICo1zdhmWz5Vv0rFFwOTKFQy7I1h08xnH-RmIVXmFtMIyhx8SFPNdkfE3b_7hjZsJ4o1aC1HxNihk8V-_YsR65miQsF4VHBWscD0zbasN6ZyWldA0ybI7witiDMWMcZAmSAqAxBs2vP7rfopNI1b6UNcUDkafmgc3pw9F1zsL3w8tzzriDw9RfZlsqsgtHFz-qCx2n8YKrzGOMS0N2mOzYfPqC8I4iJ2VSvNojZZT2G-',
    summary: 'Photography, branding, and content packages.',
  },
  {
    id: 3,
    slug: 'bloom-events',
    name: 'Bloom Events',
    category: 'Event Needs',
    distance_km: 4,
    rating: 5.0,
    verified: 1,
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDj6vDT4irxO3rvsTjy9rP4A6qFtT1VkIvyEGfpUUXh3NmEFe_w7GRpYLq-XWu0jRUzZNEIW9HZwyv2YhesopntAnSygvkOGyp7YsBl1NIRcOot6EH5TN3pXm22dEKlVVqPbY1Q4ok0BW_dxE5p_IM5xSXkm_Cgsmfe4KV8GFcIF4YLtUdD7ZNknS8-np6SDj1ukEHhDmJ22pQ-W-ylTdu_siLfawdKjPiXNsHpS8SlpWSS-hXHKnvF-aVlGnJofCnICNcxNm_XfB83',
    summary: 'Graduation, birthday, and campus event packages.',
  },
  {
    id: 4,
    slug: 'daily-dose-cafe',
    name: 'Daily Dose Cafe',
    category: 'Daily Essentials',
    distance_km: 1,
    rating: 4.7,
    verified: 1,
    image_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxjB6IDz0VrZGx_nje5WnW-rWR8dftq1onRdwr-EI5XbDmqNAa1G3HcJge5mkIyvjiiyaMylIj_2hwKFx5Q_j3Qax6ZT52FvISZXAd2Gtn_bZnAw2JbpeXwoTeekjJufcV2NtuUjRkUFMoDDGrhb3FyQfo1dgSe1_Di9J_bkDMJf38exPqHb9RYnr2n0AlCjsNSsfmw2iejSxrro7htB4HoKoM9xy4SffzLdkJh_tEnlJl0X4Xaawf0i54-5JSQkJ45PY6BJrSiTtG',
    summary: 'Coffee, brunch, and daily student essentials.',
  },
];

const fallbackThreads = [
  {
    id: 1,
    title: 'Mencari Jasa Desain Grafis Cepat untuk Ulang Tahun Anak',
    author: 'Ibu Anita',
    replies: 4,
    likes: 24,
    category: 'Mencari Jasa',
    excerpt: 'Butuh bantuan banner dan undangan digital untuk ulang tahun anak minggu depan.',
  },
  {
    id: 2,
    title: 'Rekomendasi Tempat Print 24 Jam di Sekitar UNESA',
    author: 'Budi Santoso',
    replies: 8,
    likes: 12,
    category: 'Tanya Jawab',
    excerpt: 'Cari tempat print yang buka sampai dini hari di daerah Lidah Wetan atau Babatan.',
  },
  {
    id: 3,
    title: 'Vendor katering sehat untuk event kampus',
    author: 'Siska P.',
    replies: 6,
    likes: 19,
    category: 'Rekomendasi Warga',
    excerpt: 'Mencari katering sehat untuk acara komunitas dengan budget mahasiswa.',
  },
];

const fallbackUsers = [
  {
    id: 1,
    full_name: 'Ibu Anita',
    email: 'ibu.anita@example.com',
    role: 'customer',
    city: 'Surabaya Barat',
  },
];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Block direct access to server-side and deployment-only files.
app.use((request, response, next) => {
  const blockedPatterns = [
    /^\/\.env/i,
    /^\/server\.js$/i,
    /^\/db\.js$/i,
    /^\/routes\.js$/i,
    /^\/schema\.sql$/i,
    /^\/seed\.sql$/i,
    /^\/docker-compose\.ya?ml$/i,
    /^\/package(?:-lock)?\.json$/i,
    /^\/node_modules\//i,
  ];

  if (blockedPatterns.some((pattern) => pattern.test(request.path))) {
    response.status(404).send('Not found');
    return;
  }

  next();
});

function sendPage(relativePath) {
  return (request, response) => response.sendFile(path.join(rootDir, relativePath));
}

function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase();
}

app.use((request, response, next) => {
  const destination = LEGACY_ROUTE_REDIRECTS[request.path];

  if (destination) {
    response.redirect(301, destination);
    return;
  }

  next();
});

app.use(express.static(rootDir, { dotfiles: 'ignore', extensions: ['html'] }));

async function queryVendors() {
  try {
    const rows = await query(
      `SELECT id, slug, name, category, distance_km, rating, verified, image_url, summary
       FROM vendors
       ORDER BY featured_rank ASC, id ASC`
    );
    return rows;
  } catch (error) {
    return fallbackVendors;
  }
}

async function queryThreads() {
  try {
    const rows = await query(
      `SELECT id, title, author, replies, likes, category, excerpt
       FROM forum_threads
       ORDER BY created_at DESC, id DESC`
    );
    return rows;
  } catch (error) {
    return fallbackThreads;
  }
}

async function findUserByLogin(identifier) {
  const login = normalizeQuery(identifier);

  try {
    const rows = await query(
      `SELECT id, full_name, email, phone, password_hash, role, city
       FROM users
       WHERE LOWER(email) = ? OR LOWER(phone) = ?
       LIMIT 1`,
      [login, login]
    );

    if (rows.length > 0) {
      return rows[0];
    }
  } catch (error) {
    // Fall through to seed users when the database is offline.
  }

  return fallbackUsers.find((user) => user.email.toLowerCase() === login) || null;
}

app.get(APP_ROUTES.home, sendPage('index.html'));
app.get(APP_ROUTES.directory, sendPage('explore_eksplorasi_bisnis_mahasiswa_updated/code.html'));
app.get(APP_ROUTES.community, sendPage('community_forum_uc_connect_updated/code.html'));
app.get(APP_ROUTES.communityThread, sendPage('forum_thread_detail_uc_connect_final_header_footer/code.html'));
app.get(APP_ROUTES.login, sendPage('authentication_login_register/code.html'));
app.get(APP_ROUTES.register, sendPage('authentication_register/code.html'));
app.get(APP_ROUTES.profile, sendPage('customer_profile_ibu_anita_with_logout/code.html'));
app.get(APP_ROUTES.profileEdit, sendPage('edit_profile_pengaturan_profil_final_header_alignment/code.html'));
app.get(APP_ROUTES.vendorDetail, sendPage('vendor_detail_bite_bliss_bakery/code.html'));
app.get(APP_ROUTES.vendorDashboard, sendPage('vendor_dashboard_bite_bliss_bakery/code.html'));
app.get(APP_ROUTES.admin, sendPage('super_admin_control_panel/code.html'));

app.get('/api/health', async (request, response) => {
  response.json({
    ok: true,
    databaseReady: await isDatabaseReady(),
  });
});

app.get('/api/vendors', async (request, response) => {
  const vendors = await queryVendors();
  const search = normalizeQuery(request.query.search);
  const category = normalizeQuery(request.query.category);

  const filtered = vendors.filter((vendor) => {
    const vendorText = normalizeQuery(`${vendor.name} ${vendor.category} ${vendor.summary}`);
    const matchesSearch = !search || vendorText.includes(search);
    const matchesCategory = !category || normalizeQuery(vendor.category).includes(category);
    return matchesSearch && matchesCategory;
  });

  response.json(filtered);
});

app.get('/api/vendors/:slug', async (request, response) => {
  const vendors = await queryVendors();
  const vendor = vendors.find((item) => item.slug === request.params.slug || String(item.id) === request.params.slug);

  if (!vendor) {
    response.status(404).json({ error: 'Vendor not found' });
    return;
  }

  response.json(vendor);
});

app.get('/api/forum-threads', async (request, response) => {
  response.json(await queryThreads());
});

app.get('/api/me', async (request, response) => {
  response.json(fallbackUsers[0]);
});

app.post('/api/register', async (request, response) => {
  const { fullName, email, contact, password, phone, role = 'customer', city = 'Surabaya Barat' } = request.body;
  const emailValue = email || contact;

  if (!fullName || !emailValue || !password) {
    response.status(400).json({ error: 'fullName, email/contact, and password are required' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName, emailValue, phone || (emailValue.includes('@') ? null : emailValue), passwordHash, role, city]
    );

    response.status(201).json({
      id: result.insertId,
      fullName,
      email: emailValue,
      role,
      city,
    });
  } catch (error) {
    response.status(503).json({ error: 'Database is not available. Start the MySQL container first.' });
  }
});

app.post('/api/login', async (request, response) => {
  const { identifier, email, contact, password } = request.body;
  const loginIdentifier = identifier || email || contact;

  if (!loginIdentifier || !password) {
    response.status(400).json({ error: 'identifier and password are required' });
    return;
  }

  const user = await findUserByLogin(loginIdentifier);

  if (!user) {
    response.status(401).json({ error: 'Invalid login' });
    return;
  }

  if (user.password_hash) {
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      response.status(401).json({ error: 'Invalid login' });
      return;
    }
  }

  response.json({
    id: user.id,
    fullName: user.full_name || user.fullName,
    email: user.email,
    role: user.role || 'customer',
    city: user.city || 'Surabaya Barat',
  });
});

app.use((request, response) => {
  if (request.path.startsWith('/api/')) {
    response.status(404).json({ error: 'Not found' });
    return;
  }

  if (request.accepts('html')) {
    response.status(404).sendFile(path.join(rootDir, '404.html'));
    return;
  }

  response.status(404).send('Not found');
});

async function initializeApp() {
  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = (async () => {
  if (await isDatabaseReady()) {
    try {
      await ensureSchema();
      console.log('Database connected and schema ensured.');
    } catch (error) {
      console.warn('Database is reachable, but schema initialization was skipped:', error.message);
    }
  } else {
    console.warn('MySQL is not reachable yet. Serving fallback content until the database is deployed.');
  }

  return app;
  })();

  return startupPromise;
}

async function start() {
  await initializeApp();

  app.listen(port, () => {
    console.log(`UC-Connect running in ${nodeEnv} mode at http://localhost:${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;