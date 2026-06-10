'use strict';

import osCheck from './utils/oscheck'; //  OSチェック
import smoothScroll from './class/smoothscroll'; //  スムーススクロール
import Mobile_Menu from './object/mobile_menu'; //  ハンバーガー含むSPメニュー

import AccordionDetails from './class/accordion_details'; //  アコーディオンdetails（ヘッダーメガメニュー等で使用）
import scrollEvents from './class/scrollevent'; //  スクロールイベント
import TelLink from './class/tel_link'; //  電話リンク制御(PC時無効化)

import swiperGroup from './object/swiper'; //  スライダー:swiper

import StaggerText from './animation/staggertext';  //  テキストStaggerアニメーション

//  アニメーション
import ScrollTriggerObserve from './animation/scrollTriggerObserve'; //  observe仕様のスクロール判定(雑・負荷小)
import ScrollProgress from './animation/scrollprogress';
import TriggerAnimation from './animation/triggeranim';
import Hover from './animation/hover';

//--------------------------------------------------------
//  インスタンス管理（遅延初期化パターン）
//  必要なタイミングで初めてインスタンス化することでメモリ・CPU効率化

// Critical用(DOMContentLoaded時に即生成)
let oscheck = null;
let smoothscroll = null;
let mobile_menu = null;
let scrollevents = null;
let swipergroup = null;
let scrollTriggerObserve = null;
let triggeranim = null;
let staggertext = null;
let tellink = null;

// Interactive用（次フレームで生成）
let accordionDetails = null;

// Animation用（アイドル時に生成）
let scrollProgress = null;
let hover = null;

//--------------------------------------------------------
//  初期化関数（優先度別）

// 【最優先】Critical: レイアウト・ナビゲーション・ファーストビュー表示
const initCritical = function () {
  // インスタンス生成(ここで初めてnew)
  oscheck = new osCheck();
  mobile_menu = new Mobile_Menu();
  // scrollevents: スクロール閾値を調整したい場合は closeMenuThreshold オプションで指定
  scrollevents = new scrollEvents({ closeMenuThreshold: 5 });
  swipergroup = new swiperGroup();
  scrollTriggerObserve = new ScrollTriggerObserve();
  triggeranim = new TriggerAnimation();
  tellink = new TelLink();

  //  bodyのclass名にOSとブラウザを記述(CSS切り替え - 軽量)
  oscheck.markbody();

  //  電話リンク制御(PC時無効化 - 軽量)
  tellink.register();

  //  テキストStagger分割処理（DOM操作のためCriticalで実行）
  //  ⚠️ 重要: Swiper初期化の前に実行する必要がある
  //  理由: Swiperのinitイベントでdata-anim-mode="slide"要素を検索するため
  staggertext = new StaggerText();
  staggertext.register();

  //  スライダー作成（メインビジュアル - レイアウトシフト防止のため最優先）
  swipergroup.register();

  //  スクロールイベント（ヘッダー固定など - 軽量）
  scrollevents.register();
  scrollevents.task();

  //  モバイルメニュー（ハンバーガー - Above the Fold）
  mobile_menu.register();

  //  ⚠️ 重要: ファーストビューのアニメーション初期化（CLS防止のため Critical）
  scrollTriggerObserve.register();
  triggeranim.register();

  // ⚡ smoothscrollのみ次フレームに遅延（forced reflow対策）
  requestAnimationFrame(() => {
    smoothscroll = new smoothScroll();
    smoothscroll.registIDJump();
    smoothscroll.registPageJump();

    // 初期化完了を通知(アニメーション有効化フラグ)
    requestAnimationFrame(() => {
      document.body.classList.add('is-loaded');
    });
  });
};


// 【高優先】Interactive: インタラクション要素（アコーディオン）
const initInteractive = function () {
  //  アコーディオン（ヘッダーのメガメニュー開閉などに使用）
  accordionDetails = new AccordionDetails({ duration: 300 });
  accordionDetails.register();

  // モバイルメニューにアコーディオンインスタンスを設定（具体クラス依存を排除するため）
  if (mobile_menu && accordionDetails) {
    mobile_menu.setAccordionInstance(accordionDetails);
  }

  // スクロールイベントにもアコーディオンインスタンスを設定（スクロール時にメガメニューを閉じる）
  if (scrollevents && accordionDetails) {
    scrollevents.setAccordionInstance(accordionDetails);
  }
};


// 【中優先】Animation: Below the Foldのアニメーション（遅延可能）
const initAnimation = function () {
  // インスタンス生成（アイドル時）
  scrollProgress = new ScrollProgress();
  hover = new Hover();

  //  スクロール連動（下部セクション用 - 軽量）
  scrollProgress.register();

  //  ボタン型コンテンツのホバー判定処理
  hover.register();
};


// 【後方互換】従来のinit()関数（緊急時に一括初期化可能）
const init = function () {
  initCritical();
  initInteractive();
  initAnimation();
};

//--------------------------------------------------------
//  イベント: ロード（段階的初期化でCore Web Vitals最適化）

window.addEventListener('DOMContentLoaded', () => {
  // Phase 1: Critical（最優先 - レイアウト・ナビゲーション）
  initCritical();

  // Phase 2: Interactive（次フレーム - インタラクション要素）
  requestAnimationFrame(() => {
    initInteractive();
  });

  // Phase 3: Animation（アイドル時 - 演出）
  if ('requestIdleCallback' in window) {
    // モダンブラウザ: アイドル時に実行（FID/INP最適化）
    requestIdleCallback(() => {
      initAnimation();
    }, { timeout: 2000 });
  } else {
    // Fallback（Safari等）: 短い遅延で実行
    setTimeout(() => {
      initAnimation();
    }, 50);
  }
});

//  イベント: スクロール
window.addEventListener('scroll', () => {
  scrollevents.task();
});

//  イベント: リサイズ
window.addEventListener('resize', () => {
  mobile_menu.resize();
});
