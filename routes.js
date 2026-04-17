const APP_ROUTES = {
  home: '/',
  directory: '/directory',
  community: '/community',
  communityThread: '/community/thread',
  login: '/login',
  register: '/register',
  profile: '/profile',
  profileEdit: '/profile/edit',
  vendorDetail: '/vendor/bite-bliss-bakery',
  vendorDashboard: '/vendor/dashboard',
  admin: '/admin',
};

const LEGACY_ROUTE_REDIRECTS = {
  '/index.html': APP_ROUTES.home,
  '/uc_connect_homepage/code.html': APP_ROUTES.home,
  '/explore_eksplorasi_bisnis_mahasiswa_updated/code.html': APP_ROUTES.directory,
  '/community_forum_uc_connect_updated/code.html': APP_ROUTES.community,
  '/forum_thread_detail_uc_connect_final_header_footer/code.html': APP_ROUTES.communityThread,
  '/authentication_login_register/code.html': APP_ROUTES.login,
  '/authentication_register/code.html': APP_ROUTES.register,
  '/customer_profile_ibu_anita_with_logout/code.html': APP_ROUTES.profile,
  '/edit_profile_pengaturan_profil_final_header_alignment/code.html': APP_ROUTES.profileEdit,
  '/vendor_detail_bite_bliss_bakery/code.html': APP_ROUTES.vendorDetail,
  '/vendor_dashboard_bite_bliss_bakery/code.html': APP_ROUTES.vendorDashboard,
  '/super_admin_control_panel/code.html': APP_ROUTES.admin,
};

module.exports = {
  APP_ROUTES,
  LEGACY_ROUTE_REDIRECTS,
};