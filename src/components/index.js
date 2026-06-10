//------------------------------------
//  バレルファイル
//  共通インポートまとめ
//------------------------------------
// コンポーネント
//--------------------------------
// 大枠
export { default as Layout } from '@layouts/Layout.astro';
export { default as HeaderBar} from '@components/layouts/Header.astro';
export { default as Footer} from '@components/layouts/Footer.astro';

// SEO (JSON-LD)
export { default as JsonLdBreadcrumbOnly } from '@components/layouts/seo/JsonLdBreadcrumbOnly.astro'; // パンくず専用（Layout で使用）

//--------------------------------
//  セクション
export { default as MVPageFullVisual} from '@components/template-parts/MVPageFullVisual.astro';

//--------------------------------
//  コンテンツ: セクション以下、パーツ以上の塊、内容がある程度決まっているもの
//  パンくず
export { default as PageBreadCrumb } from '@components/template-parts/PageBreadCrumb.astro';
//  事例カード
export { default as WorksCard } from '@components/template-parts/WorksCard.astro';



//--------------------------------
//  最小パーツ
//  画像
export { default as Img } from '@components/common/Img.astro';

//--------------------------------
//  データ（サイト共通データ）
export { works, homeWorks } from '@scripts/astro/site/works-data.js';
