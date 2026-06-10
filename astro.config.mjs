import { defineConfig } from 'astro/config';
import relativeLinks from 'astro-relative-links';
import autoprefixer from 'autoprefixer';  //  CSS : 自動ベンダープレフィックス
import postcssMergeQueries from "postcss-merge-queries";  //  CSSメディアクエリをまとめる
//import purgecss from '@fullhuman/postcss-purgecss/lib/postcss-purgecss.esm.js';  //  未使用CSSの削除
import mdx from '@astrojs/mdx';
import remarkBreaks from 'remark-breaks';

import cssnano from 'cssnano'; // CSSのみ圧縮


export default defineConfig({
  // canonicalとサイトマップに使用されるURL
  // import.meta.env.SITE として各コンポーネントから参照可能
  site: 'https://nino-code-portfolio.pages.dev', // ポートフォリオ公開用（Cloudflare Pagesのプロジェクト名に合わせる）
  output: 'static', //  静的ページの出力
  base: '/',    // デプロイのベースURL
  compressHTML: false,  // HTMLのミニファイ解除
  server: {
    host: true,   // 他の端末からローカルサーバを確認させせたいので、hostをtrueにする
    open: true,   // 開発サーバーが立ち上がったらブラウザを自動で開かせる
  },
  integrations: [
    relativeLinks(),
    mdx()
  ],
  markdown: {
    remarkPlugins: [remarkBreaks],
    extendDefaultPlugins: true
  },
  build: {
    //format: 'file', // デフォルトの 'directory' を 'file' に変更 : スラッグ/index.htmlではなくファイル名.htmlで納品する場合
    assets: 'assets',
    inlineStylesheets: 'never'
  },
  //  コンポーネントの自動読み込み
  components: {
    '@components': './src/components'
  },

  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    assetsInclude: ['**/*.jpg', '**/*.png' ],

    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler", //  legacy-js-api警告の対処
        }
      },
      //  ビルド後のCSSを調整
      postcss: {
        plugins: [
          autoprefixer(), //  ベンダープレフィックス付与
          postcssMergeQueries, //  CSSのmediaクエリ分岐を一つにまとめる
          // purgecss({  // post-build3.jsでdist_gulp専用に実行するためコメントアウト
          //   content: ['./src/**/*.{astro,html,js,ts}'],
          //   defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
          // }),
          cssnano({ preset: 'default' }) // CSSのみ圧縮
        ],
      }
    },

    build: {
      minify: false,  //  CSSをそのまま出す場合
      //minify: true, //  CSS圧縮(JSも圧縮してしまうため注意)
      outDir: 'dist', // ビルド出力ディレクトリ
      rollupOptions: {
        output: {
          assetFileNames: assetInfo => {
            const extType = assetInfo.name.split('.').at(-1);
            if (/css|scss/i.test(extType)) {
              return 'assets/css/style.css';
            }
          },
          entryFileNames: 'assets/js/script.js'
        }
      },
    },
  },
  //prefetch: true
});