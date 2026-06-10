//----------------------------------------
//
//  レスポンシブ判定ユーティリティ
//  
//  目的: 全クラスで共通のブレークポイント判定を提供
//  ブレークポイント768pxを一元管理し、DRY原則を徹底
//
//----------------------------------------

/**
 * レスポンシブ判定ユーティリティクラス
 * 
 * 使用例:
 * ```javascript
 * import { responsive } from '../utils/responsive.js';
 * 
 * if (responsive.isMobile()) {
 *   // SP時の処理
 * }
 * 
 * // レスポンシブ変化を監視
 * const unsubscribe = responsive.onChange((isMobile) => {
 *   console.log('画面幅が変更されました:', isMobile ? 'SP' : 'PC');
 * });
 * 
 * // 監視解除
 * unsubscribe();
 * ```
 */
class ResponsiveUtil {
  /**
   * コンストラクタ
   * @param {number} breakpoint - ブレークポイント（デフォルト: 768）
   */
  constructor(breakpoint = 768) {
    this.breakpoint = breakpoint;
    // SP判定: breakpoint未満（768px未満 = 767px以下）
    this.mobileQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    // アニメーション削減モード判定
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  /**
   * 現在がモバイル幅（SP）か判定
   * @returns {boolean} true: SP（768px未満）, false: PC（768px以上）
   */
  isMobile() {
    return this.mobileQuery.matches;
  }

  /**
   * 現在がデスクトップ幅（PC）か判定
   * @returns {boolean} true: PC（768px以上）, false: SP（768px未満）
   */
  isDesktop() {
    return !this.mobileQuery.matches;
  }

  /**
   * ユーザーがアニメーション削減を希望しているか
   * @returns {boolean} true: アニメーション削減モード, false: 通常モード
   */
  prefersReducedMotion() {
    return this.reducedMotionQuery.matches;
  }

  /**
   * レスポンシブ変化時のコールバック登録
   * 
   * @param {Function} callback - 変化時に実行する関数 (isMobile: boolean) => void
   * @returns {Function} 解除用関数（呼び出すとイベントリスナーを削除）
   * 
   * @example
   * const unsubscribe = responsive.onChange((isMobile) => {
   *   if (isMobile) {
   *     console.log('SPモードになりました');
   *   } else {
   *     console.log('PCモードになりました');
   *   }
   * });
   * 
   * // 解除する場合
   * unsubscribe();
   */
  onChange(callback) {
    const handler = (e) => callback(e.matches);
    this.mobileQuery.addEventListener('change', handler);
    
    // 解除用関数を返す（クロージャでhandlerを保持）
    return () => this.mobileQuery.removeEventListener('change', handler);
  }

  /**
   * 現在のブレークポイント値を取得
   * @returns {number} ブレークポイント値（例: 768）
   */
  getBreakpoint() {
    return this.breakpoint;
  }

  /**
   * MediaQueryListオブジェクトを直接取得（上級者向け）
   * @returns {MediaQueryList} matchMediaで生成されたオブジェクト
   */
  getMediaQuery() {
    return this.mobileQuery;
  }
}

//----------------------------------------
// シングルトンとしてエクスポート
// プロジェクト全体で同一インスタンスを共有
//----------------------------------------
export const responsive = new ResponsiveUtil(768);

//----------------------------------------
// クラスそのものもエクスポート（カスタムインスタンス生成用）
//----------------------------------------
export default ResponsiveUtil;
