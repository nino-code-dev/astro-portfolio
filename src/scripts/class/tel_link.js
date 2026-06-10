//----------------------------------------
//
//  電話リンク制御クラス
//
//----------------------------------------

import { responsive } from '../utils/responsive.js';

/**
 * 電話リンク制御クラス
 *
 * 【目的】
 * PC環境で電話リンク(href="tel:...")を無効化し、SP時のみタップ可能にする
 *
 * 【背景】
 * - 一般的なコーポレートサイトではSP時のみ電話リンクを有効化する
 * - CSSの pointer-events:none だけでは tabindex でキーボードフォーカスが入る問題
 * - PC時にクリックするとSkype等が勝手に起動してしまうのを防ぐ
 *
 * 【動作】
 * - 初期化時に画面幅を判定 (responsive.isMobile() 使用)
 * - PC時: href削除 + tabindex="-1" + pointer-events:none で完全無効化
 * - SP時: 何もしない(デフォルトの電話リンク動作を維持)
 * - リサイズ時は自動再判定(SP⇔PC切り替え対応)
 *
 * 【使用例】
 * ```javascript
 * import TelLink from './class/tel_link';
 * const tellink = new TelLink();
 * tellink.register();
 * ```
 */
export default class TelLink {
  constructor() {
    this.selector = 'a[href^="tel:"]';  // 対象セレクタ: tel:で始まるhref
    this.telLinks = [];                 // 電話リンク要素配列
    this.originalHrefs = new Map();     // 元のhref保存用(SP⇔PC切り替え時に復元)
    this.isMobile = null;               // 現在の状態(true=SP, false=PC)
    this.unsubscribe = null;            // responsive.onChange()の解除関数
  }

  /**
   * 初期化: 電話リンクを取得して初回制御
   */
  register() {
    // 電話リンク要素を全て取得
    this.telLinks = Array.from(document.querySelectorAll(this.selector));

    // 元のhrefを全て保存(PC→SPに戻した時に復元するため)
    this.telLinks.forEach(el => {
      this.originalHrefs.set(el, el.getAttribute('href'));
    });

    // 初回制御
    this.update();

    // レスポンシブ変化を監視(SP⇔PC切り替え時に自動更新)
    this.unsubscribe = responsive.onChange((isMobile) => {
      this.update();
    });
  }

  /**
   * 制御更新: 画面幅に応じてリンクを有効/無効化
   */
  update() {
    const currentIsMobile = responsive.isMobile();

    // 状態が変わっていない場合はスキップ(パフォーマンス対策)
    if (this.isMobile === currentIsMobile) return;

    this.isMobile = currentIsMobile;

    this.telLinks.forEach(el => {
      if (this.isMobile) {
        // SP: 電話リンク有効化
        this.enableTelLink(el);
      } else {
        // PC: 電話リンク無効化
        this.disableTelLink(el);
      }
    });
  }

  /**
   * 電話リンク無効化(PC時)
   * 
   * 理由:
   * - href削除: リンク機能を無効化
   * - tabindex="-1": キーボードナビゲーションから除外
   * - pointer-events: none: マウスイベントを無効化
   * - cursor: default: ホバー時にポインターが変わらないように
   */
  disableTelLink(el) {
    //el.removeAttribute('href'); //  CSSの分岐ができなくなるため禁止。消さなくてもタブフォーカスは回避できる
    el.setAttribute('tabindex', '-1');
    el.style.pointerEvents = 'none';
    el.style.cursor = 'default';
  }

  /**
   * 電話リンク有効化(SP時)
   * 
   * 元の状態に復元する
   */
  enableTelLink(el) {
    const originalHref = this.originalHrefs.get(el);
    if (originalHref) {
      el.setAttribute('href', originalHref);
    }
    el.removeAttribute('tabindex');
    el.style.pointerEvents = '';
    el.style.cursor = '';
  }

  /**
   * 後処理: イベントリスナーを解除
   * (通常は呼ばれないが、SPA等で必要な場合に備えて)
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
