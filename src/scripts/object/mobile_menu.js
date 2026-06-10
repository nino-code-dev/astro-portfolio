//----------------------------------------
//
//  モバイルハンバーガーメニュー
//
//  ハンバーガーボタンを含む処理
//
//----------------------------------------
import { responsive } from '../utils/responsive.js';

export default class mobile_menu {
  constructor() {
    this.buttons = [];
    this.button_hamburger = null;
    this.transitionEndHandler = null;
    this.isAnimating = false;

    // レスポンシブ対応: responsiveユーティリティを使用（旧: window.matchMedia）

    // iOS Safari検出はregister()で実行する
    this.isIOS = false;
    this.isIOSSafari = false;

    // アコーディオンインスタンスの参照を保持
    this.accordionInstance = null;
  }

  //----------------------------------------
  //  各種イベントの登録
  register() {
    // oscheck.jsの結果を活用したiOS Safari検出（register()で実行）
    this.isIOS = this.detectIOSFromBodyClass();
    this.isIOSSafari = this.isIOS && this.detectSafariFromBodyClass();

    // ハンバーガーボタンの要素を取得
    let button = document.querySelector('.js-button-hamburger');
    //  ボタンがない場合は終了
    if (button === null) {
      console.warn('ハンバーガーメニューのボタンが見つかりません。');
      return;
    }
    this.regist_hamburger(button);

    // 初期状態でメニューを非表示に設定
    this.initializeMenuState();

    // レスポンシブ対応: 画面サイズ変更時の処理
    this._responsiveUnsubscribe = responsive.onChange(() => this.handleResponsiveChange());
  }

  //----------------------------------------
  //  メニューの初期状態を設定
  initializeMenuState() {
    if (!this.elm_menu) return;

    // 初期状態では閉じた状態に設定
    this.elm_menu.style.maxBlockSize = '0';
    this.elm_menu.style.overflow = 'clip'; // clip使用(スクロールバー表示防止)
    this.elm_menu.classList.remove('is-open');

    if (this.elm_header) {
      this.elm_header.classList.remove('is-open');
    }

    if (this.elm_hamburger_button) {
      this.elm_hamburger_button.classList.remove('is-open');
      this.elm_hamburger_button.setAttribute("aria-expanded", "false");
    }

    if (this.elm_bg) {
      this.elm_bg.classList.remove('is-open');
    }
  }

  //----------------------------------------
  //  レスポンシブ変更時の処理
  handleResponsiveChange() {
    // PC時（768px以上）になったら強制的に閉じる
    if (responsive.isDesktop()) {
      this.hamburgerClose();
      // PC幅に遷移したらSP用ソートを復元
      this._restoreMenuOrder();
    }
  }

  //========================================
  // 環境検知・ユーティリティ
  //========================================

  //  PC判定
  isPC() {
    return responsive.isDesktop();
  }

  //  oscheck.jsによって設定されたbodyクラスから判定
  detectIOSFromBodyClass() {
    const body = document.body;

    // oscheck.jsで設定される可能性のあるクラス
    return body.classList.contains('is-iphone') ||
      body.classList.contains('is-ipad') ||
      (body.classList.contains('is-mac') && this.hasIOSCharacteristics());
  }

  //  oscheck.jsによって設定されたbodyクラスからSafari判定
  detectSafariFromBodyClass() {
    return document.body.classList.contains('safari');
  }

  //  iOS的な特徴を持つかどうかの追加判定
  hasIOSCharacteristics() {
    return 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      responsive.isMobile(); // モバイル幅判定
  }

  //========================================
  // 依存性注入・外部連携
  //========================================

  /**
   * アコーディオンインスタンスを設定
   * @param {Object} instance - AccordionDetails インスタンス
   */
  setAccordionInstance(instance) {
    this.accordionInstance = instance;
  }

  /**
   * ヘッダー内の全メガメニューアコーディオンを閉じる
   * ハンバーガーメニューを開く際に実行される
   * accordion_details.js のAPIに委譲(具体クラス依存を排除)
   * @param {boolean} instant - true の場合アニメーション無しで即座に閉じる(デフォルト: true)
   */
  closeAllAccordions(instant = true) {
    if (!this.accordionInstance) return;
    // ハンバーガー開く時は即座に閉じる(instant: true)
    // ハンバーガー閉じる時もアニメーション不要なので instant: true
    this.accordionInstance.closeAllByGroup('header', null, instant);
  }

  //========================================
  // ライフサイクル管理
  //========================================

  //  破棄
  destroy() {
    //  イベント破棄
    this._removeEvent(this.elm_hamburger_button, 'click', '_onHamburgerToggleClick');
    this._removeEvent(this.elm_bg, 'click', '_onBackgroundClick');
    this._removeEvent(this.elm_close_button, 'click', '_onHamburgerCloseClick');
    this._removeEvent(this.elm_sp_menu_focus_trap_end, 'focus', '_onFocusEnd');
    this._removeEvent(this.elm_header, 'keydown', '_onEscDown');
    this.elm_menu.querySelectorAll('a').forEach(link => {
      this._removeEvent(link, 'click', '_onMenuLinkClick');
    });

    // ハンバーガー ↔ メニュー内部フォーカス橋渡し keydown 解除
    if (this.elm_hamburger_button && this._hamburgerBridgeHandler) {
      this.elm_hamburger_button.removeEventListener('keydown', this._hamburgerBridgeHandler);
      this._hamburgerBridgeHandler = null;
    }

    // レスポンシブ対応のイベント削除
    if (this._responsiveUnsubscribe) {
      this._responsiveUnsubscribe();
      this._responsiveUnsubscribe = null;
    }

    this.buttons = [];
    this.button_hamburger = null;
    this.transitionEndHandler = null;
  }

  //========================================
  // イベント管理ヘルパー
  //========================================

  /**
   * イベントハンドラを登録
   * handlerNameに対応するメソッドをbindして自動管理
   * @param {HTMLElement} target - イベント対象要素
   * @param {string} type - イベント型(click, keydown等)
   * @param {string} handlerName - メソッド名('_onHamburgerToggleClick'等)
   * @param {...any} args - bindに渡す追加引数
   */
  _registerEvent(target, type, handlerName, ...args) {
    if (!target || !handlerName) return;
    const normalized = handlerName.replace(/^_+/, '');
    const methodRef = this[`_${normalized}`] || this[handlerName] || this[`_${handlerName}`] || this[normalized];
    if (typeof methodRef !== 'function') {
      console.warn('[mobile_menu] handler not found:', handlerName);
      return;
    }
    const boundName = `_bound_${normalized}_${type}`;
    this[boundName] = methodRef.bind(this, ...args);
    target.addEventListener(type, this[boundName]);
  }

  /**
   * イベントハンドラを削除
   * _registerEventで登録したハンドラを解除
   * @param {HTMLElement} target - イベント対象要素
   * @param {string} type - イベント型
   * @param {string} handlerName - メソッド名
   */
  _removeEvent(target, type, handlerName) {
    if (!target || !handlerName) return;
    const normalized = handlerName.replace(/^_+/, '');
    const boundName = `_bound_${normalized}_${type}`;
    if (this[boundName]) {
      target.removeEventListener(type, this[boundName]);
      this[boundName] = null;
    }
  }

  //========================================
  // DOM要素管理
  //========================================

  //  ハンバーガー要素を設定
  set_hamburgerElements(i_item) {
    this.elm_hamburger_button = i_item;
  }

  //  ハンバーガー要素に関連する全ての要素を取得
  get_hamburgerElements() {
    //  閉じるボタン( サイドメニュー版は開くボタンと別になる )
    this.elm_close_button = document.querySelector('.js-button-hamburger-close');
    //  背景
    this.elm_bg = document.querySelector('.p-header__bg');
    //  ヘッダー本体
    this.elm_header = document.querySelector('#header');
    //  SPでも表示されるバー部分
    this.elm_header_bar = document.querySelector('#header-bar');
    //  メニュー要素
    this.elm_menu = document.querySelector('#sp-menu');
    //  フォーカストラップ終端要素(循環用)
    this.elm_sp_menu_focus_trap_end = null;

    this.elm_body = document.querySelector('body');
    //  メニュー要素のul ID
  }

  //========================================
  // イベントハンドラ
  //========================================

  //  イベント関数
  _onHamburgerToggleClick() {
    this.hamburgerToggle();
  }

  _onHamburgerCloseClick() {
    this.hamburgerClose();
  }

  _onBackgroundClick() {
    this.hamburgerClose();
  }

  // ESCキー押下でメニューを閉じる(a11y要件)
  _onEscDown(e) {
    // Escape 以外は無視（他キーに影響を与えない）
    if (e.key !== 'Escape') return;
    // メニューが開いている時のみ閉じる
    if (this._isMenuOpen()) {
      this.hamburgerClose();
    }
  }

  // メニュー内リンククリックでメニューを閉じる
  // ナビゲーション直後にメニューを閉じないとフォーカス制御が宙に浮くケースを防止
  _onMenuLinkClick() {
    if (this._isMenuOpen()) {
      this.hamburgerClose();
    }
  }

  //========================================
  // フォーカストラップ管理
  // ハンバーガーボタン ⇔ メニュー内要素の循環制御
  // メニュー開時、Tabキーで「ハンバーガー → 先頭 → ... → 末尾 → ハンバーガー」と循環
  //========================================

  // メニュー開状態判定
  _isMenuOpen() {
    return !!(this.elm_hamburger_button && this.elm_hamburger_button.getAttribute("aria-expanded") === "true");
  }

  /**
   * メニュー内のフォーカス可能要素リストを取得
   * 閉じた details 内部の要素は summary 以外除外
   * @returns {HTMLElement[]} フォーカス可能要素の配列
   */
  _getFocusableInMenuList() {
    if (!this.elm_menu) return [];
    const all = Array.from(this.elm_menu.querySelectorAll('a, button, input, textarea, select, summary, [tabindex]:not([tabindex="-1"])'));
    return all.filter(el => {
      if (el.hasAttribute('disabled')) return false;
      if (el.closest('[inert]')) return false;
      if (el.closest('details:not([open])') && el.tagName.toLowerCase() !== 'summary') return false;
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return false;
      return true;
    });
  }

  /**
   * メニュー内の最初のフォーカス可能要素を取得
   * @returns {HTMLElement|null}
   */
  _getFirstFocusableInMenu() {
    const list = this._getFocusableInMenuList();
    return list.length ? list[0] : null;
  }

  /**
   * メニュー内の最後のフォーカス可能要素を取得
   * @returns {HTMLElement|null}
   */
  _getLastFocusableInMenu() {
    const list = this._getFocusableInMenuList();
    return list.length ? list[list.length - 1] : null;
  }

  //========================================
  // スクロール制御
  //========================================

  /**
   * スクロールイベントを無効化
   * @param {Event} event - イベントオブジェクト
   */
  disableScroll(event) {
    event.preventDefault();
  }

  /**
   * Body要素のスクロールをロック
   * iOS Safari対応を含む
   */
  lockBodyScroll() {
    this.windowScrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    if (this.isIOS) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.windowScrollPosition}px`;
    } else {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.windowScrollPosition}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
  }

  /**
   * Body要素のスクロールロックを解除
   * iOS Safari対応を含む
   */
  unlockBodyScroll() {
    if (this.isIOS) {
      document.body.style.position = '';
      window.scrollTo(0, this.windowScrollPosition);
    } else {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, this.windowScrollPosition);
    }
  }

  addScrollStop() {
    let scrollbarWidth = 0;

    if (!this.isIOS) {
      scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    }

    const header = this.elm_header_bar;

    if (this.elm_body) {
      if (this.isIOS) {
        this.elm_body.classList.add('u-scrollbar-hidden-ios');
      } else {
        this.elm_body.classList.add('u-scrollbar-hidden');
      }

      if (!this.isIOS && scrollbarWidth > 0) {
        this.elm_body.style.paddingRight = `${scrollbarWidth}px`;
        if (header) header.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    this.lockBodyScroll();
  }

  removeScrollStop() {
    if (!this.isIOS) {
      this.elm_body.style.paddingRight = '';
      const header = this.elm_header_bar;
      if (header) {
        header.style.paddingRight = '';
      }
    }

    if (this.isIOS) {
      this.elm_body.classList.remove('u-scrollbar-hidden-ios');
    } else {
      this.elm_body.classList.remove('u-scrollbar-hidden');
    }

    this.unlockBodyScroll();
  }

  //========================================
  // DOM順序制御 (SP時のメニュー行並び替え)
  //========================================

  /**
   * メニュー内の初期順序を記録(初回のみ)
   * data-original-index 属性に元の位置を保存
   */
  _captureOriginalMenuOrder() {
    if (!this.elm_menu) return;
    if (this._originalMenuChildren) return;
    const children = Array.from(this.elm_menu.children).filter(ch => ch.nodeType === 1);
    children.forEach((el, idx) => el.setAttribute('data-original-index', String(idx)));
    this._originalMenuChildren = children;
    this._spMenuSorted = false;
  }

  /**
   * SP時: メニュー行をjs-menu-rowNN-sp の番号順にソート
   * PC時: 何もしない
   */
  _sortMenuRowsForMobile() {
    if (!this.elm_menu) return;
    if (responsive.isDesktop()) return;
    this._captureOriginalMenuOrder();
    if (this._spMenuSorted) return;

    const rows = Array.from(this.elm_menu.children).filter(el => {
      return Array.from(el.classList).some(className => /js-menu-row\d+-sp/.test(className));
    });

    const rowsWithNumber = rows.map(element => {
      let number = NaN;
      for (const className of element.classList) {
        const match = className.match(/js-menu-row(\d+)-sp/);
        if (match) {
          number = parseInt(match[1], 10);
          break;
        }
      }
      return { element, number };
    }).filter(item => !isNaN(item.number));

    if (!rowsWithNumber.length) return;

    rowsWithNumber.sort((a, b) => a.number - b.number);

    const fragment = document.createDocumentFragment();
    rowsWithNumber.forEach(item => fragment.appendChild(item.element));

    this.elm_menu.appendChild(fragment);
    this._spMenuSorted = true;
  }

  /**
   * メニュー順序を初期状態に復元
   * data-original-index の順に並べ直す
   */
  _restoreMenuOrder() {
    if (!this.elm_menu) return;
    if (!this._originalMenuChildren) return;
    if (!this._spMenuSorted) return;

    const children = Array.from(this.elm_menu.children);

    const itemsWithIndex = children.map(element => {
      const index = parseInt(element.getAttribute('data-original-index') || '-1', 10);
      return { element, index };
    }).filter(item => item.index >= 0);

    itemsWithIndex.sort((a, b) => a.index - b.index);

    const fragment = document.createDocumentFragment();
    itemsWithIndex.forEach(item => fragment.appendChild(item.element));
    this.elm_menu.appendChild(fragment);
    this._spMenuSorted = false;
  }

  //========================================
  // レスポンシブ対応・リサイズ処理
  //========================================

  //  ウインドウリサイズ時の処理
  resize() {
    if (!this.elm_hamburger_button) return;
    this.get_hamburgerElements();
    this.hamburgerClose_isPC();
  }

  /**
   * PC幅にリサイズされた際、メニューが開いていれば強制的に閉じる
   */
  hamburgerClose_isPC() {
    if (this.isPC()) {
      this.hamburgerClose();
    }
  }

  //========================================
  // ハンバーガーメニュー登録
  //========================================

  /**
   * ハンバーガーメニューの各種イベントを設定
   * @param {HTMLElement} i_item - ハンバーガーボタン要素
   */
  regist_hamburger(i_item) {
    this.set_hamburgerElements(i_item);
    this.get_hamburgerElements();

    if (this.elm_hamburger_button) {
      this._registerEvent(this.elm_hamburger_button, 'click', '_onHamburgerToggleClick');
    }

    if (this.elm_bg) {
      this._registerEvent(this.elm_bg, 'click', '_onBackgroundClick');
    }
    if (this.elm_close_button) {
      this._registerEvent(this.elm_close_button, 'click', '_onHamburgerCloseClick');
    }

    if (this.elm_header) {
      this._registerEvent(this.elm_header, 'keydown', '_onEscDown');
    }

    if (this.elm_menu) {
      const menuLinks = this.elm_menu.querySelectorAll('a');
      menuLinks.forEach((link) => {
        this._registerEvent(link, 'click', '_onMenuLinkClick');
      });
    }
  }

  //========================================
  // メニュー開閉コア機能
  //========================================

  /**
   * ハンバーガーメニューの開閉トグル
   * 開く際はメガメニューアコーディオンを全て閉じ、フォーカストラップを有効化
   */
  hamburgerToggle() {
    const item = this.elm_hamburger_button;
    if (!item.classList.contains('is-open')) {
      this.closeAllAccordions();
      this._sortMenuRowsForMobile();
      item.classList.add('is-open');
      this.elm_bg.classList.add('is-open');
      item.setAttribute('aria-expanded', 'true');
      this.addScrollStop();
      this.toggleMenu(true, { direction: 'vertical' });

      const enableLoop = responsive.isMobile(); // SP幅のみ循環制御

      // 既存 boundary 解除
      if (this._menuBoundaryHandler) {
        this.elm_menu && this.elm_menu.removeEventListener('keydown', this._menuBoundaryHandler, true);
      }
      // ハンバーガー含む循環: hamburger -> first -> ... -> last -> hamburger
      if (enableLoop && this.elm_menu && this.elm_hamburger_button) {
        this._menuBoundaryHandler = (ev) => {
          if (ev.key !== 'Tab') return;
          if (!this._isMenuOpen()) return;
          const list = this._getFocusableInMenuList();
          if (!list.length) return;
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          // 正方向: 末尾で Tab → ハンバーガー
          if (!ev.shiftKey && active === last) {
            ev.preventDefault();
            this.elm_hamburger_button.focus();
            return;
          }
          // 逆方向: 先頭で Shift+Tab → ハンバーガー
          if (ev.shiftKey && active === first) {
            ev.preventDefault();
            this.elm_hamburger_button.focus();
            return;
          }
        };
        this.elm_menu.addEventListener('keydown', this._menuBoundaryHandler, true);
      } else {
        this._menuBoundaryHandler = null;
      }

      // ハンバーガーからの再エントリ: Tab→先頭 / Shift+Tab→末尾
      if (this._hamburgerReentryHandler) {
        this.elm_hamburger_button.removeEventListener('keydown', this._hamburgerReentryHandler);
      }
      if (enableLoop) {
        this._hamburgerReentryHandler = (ev) => {
          if (ev.key !== 'Tab') return;
          if (!this._isMenuOpen()) return;
          const list = this._getFocusableInMenuList();
          if (!list.length) return;
          const first = list[0];
          const last = list[list.length - 1];
          ev.preventDefault();
          if (ev.shiftKey) {
            last.focus();
          } else {
            first.focus();
          }
        };
        this.elm_hamburger_button.addEventListener('keydown', this._hamburgerReentryHandler);
      } else {
        this._hamburgerReentryHandler = null;
      }

      // 初期フォーカス: 先頭要素
      //  ※現状ではPC版ハンバーガーが存在しても初期フォーカスを表示させる予定はないのでコメントのみ
      //      if (responsive.isDesktop()) {
      //        const list = this._getFocusableInMenuList();
      //        if (list.length) list[0].focus();
      //      }
    } else {
      this.hamburgerClose();
    }
  }

  //----------------------------------------
  /**
   * ハンバーガーメニューを閉じる
   * フォーカスをハンバーガーボタンに戻し、スクロールロックを解除
   */
  hamburgerClose() {
    const item = this.elm_hamburger_button;
    //  is-openを保有している場合閉じる
    if (item.classList.contains('is-open')) {
      item.classList.remove('is-open');
      this.elm_bg.classList.remove('is-open');
      item.setAttribute("aria-expanded", "false");

      // 閉じた後のフォーカス制御（PC出現版のみ）
      // モバイルではタブ操作をしないため、フォーカスアウトラインを避ける
      if (responsive.isDesktop()) {
        item.focus();
      }

      // スクロール解除
      this.removeScrollStop();
      //      this.toggleMenu( false, { direction: 'horizontal', side: 'right' });
      this.toggleMenu(false, { direction: 'vertical' });

      // アコーディオンを全て閉じる
      this.closeAllAccordions();
      // 閉じたタイミングで元順序に復元（PC復帰や再オープン時の副作用防止）
      this._restoreMenuOrder();
    }
  }

  /**
   * メニューの開閉アニメーション
   * @param {boolean} isOpen - true で開く、false で閉じる
   * @param {Object} options - direction: 'vertical'|'horizontal', side: 'left'|'right'
   */
  toggleMenu(isOpen, options = { direction: 'vertical', side: 'left' }) {
    const menu = this.elm_menu;
    const header = this.elm_header;

    if (!menu || !header) return;

    // アニメーション中のフラグ
    if (this.isAnimating) return;
    this.isAnimating = true;

    // デフォルト: 縦開閉
    const direction = options.direction || 'vertical'; // 'vertical' or 'horizontal'
    const side = options.side || 'left'; // 'left' or 'right'

    // 開閉状態の設定
    if (isOpen) {
      menu.classList.add('is-open');
      header.classList.add('is-open');

      let keyframes;

      if (direction === 'vertical') {
        // 実際の高さを取得するため、一時的に制約を解除
        const originalMaxBlockSize = menu.style.maxBlockSize;
        const originalOverflow = menu.style.overflow;

        menu.style.maxBlockSize = 'none';
        menu.style.overflow = 'visible';
        const fullHeight = menu.scrollHeight + 'px';

        // スタイルを元に戻す
        menu.style.maxBlockSize = originalMaxBlockSize;
        menu.style.overflow = originalOverflow;

        // アニメーション開始前の状態設定
        menu.style.maxBlockSize = "0";
        menu.style.overflow = "clip";

        keyframes = [{ maxBlockSize: "0" }, { maxBlockSize: fullHeight }];
      } else {
        // 横開閉の場合
        if (side === 'left') {
          keyframes = [{ left: '-100%' }, { left: '0' }];
        } else {
          keyframes = [{ right: '-100%' }, { right: '0' }];
        }
      }

      const animationOptions = {
        duration: this.isIOS ? 250 : 300, // iOS Safariのアニメーション最適化
        easing: 'ease-in-out',
      };

      const animation = menu.animate(keyframes, animationOptions);

      animation.addEventListener('finish', () => {
        if (direction === 'vertical') {
          menu.style.overflow = 'visible';
          menu.style.maxBlockSize = 'none';
        } else {
          menu.style.overflow = '';
        }

        // iOS Safariでのレンダリング問題を回避
        if (this.isIOS) {
          // 3D変換を使用してハードウェアアクセラレーションを強制
          menu.style.transform = 'translateZ(0)';
          requestAnimationFrame(() => {
            menu.style.transform = '';
          });
        }

        this.isAnimating = false;
      });

      //  閉じる
    } else {
      let keyframes;

      if (direction === 'vertical') {
        // 実際の高さを取得するため、一時的に制約を解除
        const originalMaxBlockSize = menu.style.maxBlockSize;
        const originalOverflow = menu.style.overflow;

        menu.style.maxBlockSize = 'none';
        menu.style.overflow = 'visible';
        const fullHeight = menu.scrollHeight + 'px';

        // スタイルを元に戻す
        menu.style.maxBlockSize = originalMaxBlockSize;
        menu.style.overflow = originalOverflow;

        // アニメーション開始前の状態設定
        menu.style.maxBlockSize = fullHeight;
        menu.style.overflow = "clip";

        keyframes = [{ maxBlockSize: fullHeight }, { maxBlockSize: "0" }];
      } else {
        // 横開閉の場合
        if (side === 'left') {
          keyframes = [{ left: '0' }, { left: '-100%' }];
        } else {
          keyframes = [{ right: '0' }, { right: '-100%' }];
        }
      }

      const animationOptions = {
        duration: this.isIOS ? 250 : 300, // iOS Safariのアニメーション最適化
        easing: 'ease-in-out',
      };

      const animation = menu.animate(keyframes, animationOptions);

      animation.addEventListener('finish', () => {
        menu.style.overflow = '';
        if (direction === 'vertical') {
          menu.style.maxBlockSize = '0';
          menu.style.overflow = 'clip'; // 閉じた後は確実に隠す
        }
        menu.classList.remove('is-open');
        header.classList.remove('is-open');
        this.isAnimating = false;
      });
    }
  }

}
