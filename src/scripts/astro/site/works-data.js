/**
 * @typedef {Object} Work
 * @property {string} id
 * @property {string} href
 * @property {string} image
 * @property {string} imageAlt
 * @property {string} title
 * @property {string} period
 * @property {string} condition
 * @property {string[]} tags
 * @property {number} [homeOrder]
 * @property {boolean} showOnHome
 */

/** @type {Work[]} */
export const works = [
  {
    id: 'work-renewal',
    href: '/works/detail07/',
    image: 'common/pf/work07_01.svg',
    imageAlt: '',
    title: 'サービスサイト改修',
    period: '2026年04月',
    condition: '約5ページ / サーバー納品',
    tags: ['WordPress', 'リニューアル改修', 'アニメーション'],
    homeOrder: 1,
    showOnHome: true,
  },
  {
    id: 'corporate-nda',
    href: '/works/detail01/',
    image: 'common/pf/work01_01.svg',
    imageAlt: '',
    title: 'コーポレートサイト（NDA対処版）',
    period: '2025年10月',
    condition: '約32ページ / Astro納品',
    tags: ['NDA', '中規模', 'Astro', 'gulp'],
    homeOrder: 2,
    showOnHome: true,
  },
  {
    id: 'work-corporate',
    href: '/works/detail02/',
    image: 'common/pf/work02_01.svg',
    imageAlt: '',
    title: 'コーポレートサイト構築',
    period: '2024年05月',
    condition: '約14ページ / サーバー納品',
    tags: ['WordPress', '新規構築', 'オリジナルテーマ'],
    homeOrder: 3,
    showOnHome: true,
  },
  {
    id: 'work-media',
    href: '/works/detail03/',
    image: 'common/pf/work03_01.svg',
    imageAlt: '',
    title: 'メディアサイト改修',
    period: '2025年09月',
    condition: 'トップ1P / 既存環境に実装',
    tags: ['WordPress', '改修', 'ログイン制サイト', 'メディアサイト'],
    homeOrder: 5,
    showOnHome: true,
  },
  {
    id: 'work-lp',
    href: '/works/detail04/',
    image: 'common/pf/work04_01.svg',
    imageAlt: '',
    title: 'LP制作',
    period: '2024年10月',
    condition: '1P / サーバー納品',
    tags: ['WordPress', 'LP', 'Elementor'],
    homeOrder: 6,
    showOnHome: true,
  },
  {
    id: 'work-theme',
    href: '/works/detail05/',
    image: 'common/pf/work05_01.svg',
    imageAlt: '',
    title: 'WordPressサイト構築',
    period: '2024年08月',
    condition: '約15ページ / 既存テーマ「Astra」ベース / git納品',
    tags: ['WordPress', '新規', 'Astraテーマ', 'Git'],
    homeOrder: 4,
    showOnHome: true,
  },
  {
    id: 'work-reservation',
    href: '/works/detail06/',
    image: 'common/pf/work06_01.svg',
    imageAlt: '',
    title: '予約機能追加',
    period: '2024年05月',
    condition: '約3ページ / サーバー上改修',
    tags: ['WordPress', 'プラグイン実装・改修', 'Booking Package'],
    showOnHome: false,
  },
];

export const homeWorks = works
  .filter((work) => work.showOnHome)
  .sort((a, b) => a.homeOrder - b.homeOrder);
