//----------------------------------------
//  アコーディオン
//  details
//----------------------------------------
import { responsive } from '../utils/responsive.js';

export default class Accordion_Details {
  constructor(options = {}) {
    this.defaultOptions = {
      duration: 300,
      easing: "ease-in-out",
    };
    this.options = { ...this.defaultOptions, ...options };
    this.isAnimating = false;
    this.isPrinting = false; // 印刷中フラグを追加
    // レスポンシブ判定はresponsiveユーティリティを使用（旧: window.matchMedia）
    this.accordions = [];
    this.outsideCloseWrappers = [];
  }

  //---------------------------------------------
  // ラッパー要素に開閉状態フラグを付与
  // ラッパー内のいずれかの details が開いていれば data-has-open="true"
  //---------------------------------------------
  updateWrapperHasOpenFlag(wrapper) {
    if (!wrapper) return;
    const detailsList = wrapper.querySelectorAll('details');
    const hasOpen = Array.from(detailsList).some(d => d.hasAttribute('data-open'));
    wrapper.setAttribute('data-has-open', hasOpen ? 'true' : 'false');
    //console.log(`updateWrapperHasOpenFlag: ${hasOpen}`);
  }

  //---------------------------------------------
  // レスポンシブタイプに応じてアクティブ状態を判定
  // mobile: SP時のみ / desktop: PC時のみ / both: 常時
  //---------------------------------------------
  shouldBeActive(responsiveType) {
    const isMobile = responsive.isMobile();
    switch (responsiveType) {
      case 'mobile': return isMobile;
      case 'desktop': return !isMobile;
      case 'both':
      default: return true;
    }
  }

  //---------------------------------------------
  // アコーディオンの登録・初期化
  // 全 details 要素を収集してアニメーション設定を適用
  //---------------------------------------------
  register() {
    // アニメーション対象クラス
    const detailsBoth = document.querySelectorAll('.js-accordion-details');
    detailsBoth.forEach(el => this.initialize_details(el, 'both'));
    const detailsSp = document.querySelectorAll('.js-accordion-details--sp');
    detailsSp.forEach(el => this.initialize_details(el, 'mobile'));
    const detailsPc = document.querySelectorAll('.js-accordion-details--pc');
    detailsPc.forEach(el => this.initialize_details(el, 'desktop'));

    // ラッパ処理
    const wrappers = document.querySelectorAll('.js-details-wrap');
    wrappers.forEach(wrap => {
      // ラッパの type を記憶(メガメニュー判定用)
      const wrapperType = wrap.getAttribute('data-type') || 'accordion';

      // ラッパ内 details でアニメクラス無しのものもデフォルトでアニメーション初期化対象に変更
      const plainDetails = wrap.querySelectorAll('details');
      plainDetails.forEach(d => {
        if (d.classList.contains('js-accordion-details')) return;
        // type をカスタムプロパティとして保存
        d.__wrapperType = wrapperType;
        // 既存: _registerPlainDetails で非アニメ扱い → 変更: initialize_details(both) を呼びアニメを付与
        this.initialize_details(d, 'both');
      });

      const responsiveType = this._resolveWrapperOutsideType(wrap);
      if (responsiveType) this.setupOutsideClickClose(wrap, responsiveType);

      // 印刷時の開閉制御を設定
      this._setupPrintHandlers(wrap);
    });

    // 初期表示状態を設定（accordion のみ最初の項目を開く）
    this._setInitialOpenState();

    // レスポンシブ変化の監視（responsive.onChange使用）
    this._responsiveUnsubscribe = responsive.onChange(() => this.handleResponsiveChange());
  }

  //---------------------------------------------
  // ラッパーの外側クリック制御タイプを解決
  // data-close-on-outside-click 属性から判定
  //---------------------------------------------
  _resolveWrapperOutsideType(wrap) {
    if (wrap.hasAttribute('data-close-on-outside-click--sp')) return 'mobile';
    if (wrap.hasAttribute('data-close-on-outside-click--pc')) return 'desktop';
    if (wrap.hasAttribute('data-close-on-outside-click')) return 'both';
    return null;
  }

  //---------------------------------------------
  // アニメーション無しの details を登録（レガシー用）
  // 現在は使用されていない可能性あり
  //---------------------------------------------
  _registerPlainDetails(details) {
    // 既に登録済みならスキップ
    if (this.accordions.find(i => i.element === details)) return;
    const summary = details.querySelector('summary');
    const panel = details.querySelector('summary + *');
    if (!summary || !panel) return;
    this.accordions.push({
      element: details,
      summary,
      panel,
      detailsGroup: details.getAttribute('data-group') || null,
      responsiveType: 'both',
      isActive: true,          // 常に閉じ対象に含める（アニメーション無し）
      isInitialized: false,    // アニメーション初期化はしていない
      clickHandler: null,
      beforePrintHandler: null,
      afterPrintHandler: null,
      isPlain: true            // アニメーション無しフラグ
    });
  }

  //---------------------------------------------
  // 個別の details 要素を初期化
  // アコーディオン配列に登録し、アクティブなら初期化処理を実行
  //---------------------------------------------
  initialize_details(details, responsiveType = 'both') {
    if (!details) return;
    let info = this.accordions.find(i => i.element === details);
    const summary = details.querySelector('summary');
    const panel = details.querySelector('summary + *');
    if (!summary || !panel) return;
    const detailsGroup = details.getAttribute('data-group') || null;

    if (!info) {
      info = { element: details, summary, panel, detailsGroup, responsiveType, isActive: false, isInitialized: false, clickHandler: null, beforePrintHandler: null, afterPrintHandler: null, isPlain: false };
      this.accordions.push(info);
    } else {
      info.summary = summary; info.panel = panel; info.detailsGroup = detailsGroup; info.responsiveType = responsiveType; info.isPlain = false;
    }

    if (!this.shouldBeActive(responsiveType)) { info.isActive = false; return; }
    if (info.isInitialized) return;
    this._initializeSingle(info);
  }

  //---------------------------------------------
  // 単一の details のイベントハンドラーを設定
  // クリックイベント・印刷対応などを登録
  //---------------------------------------------
  _initializeSingle(info) {
    const { element: details, summary, panel, detailsGroup } = info;

    const clickHandler = (event) => {
      event.preventDefault();

      // この要素がアニメーション中は操作を受け付けない
      if (details._isOpening || details._isClosing) return;

      // 非アクティブ(レスポンシブで無効化されている)場合はスキップ
      if (!info.isActive) return;

      const isOpening = !details.open;

      if (isOpening) {
        // --- 開く処理 ---

        // メガメニュー判定: PC時 かつ ラッパに data-type="megamenu" が付いている場合のみ
        const wrapperType = details.__wrapperType || 'accordion';
        const isPC = responsive.isDesktop(); // 768px以上 = PC
        const isMegamenu = wrapperType === 'megamenu' && isPC;

        // グループ内に既に開いている他のメニューがあるかチェック
        const hasOtherOpen = detailsGroup && this._hasOpenInGroup(detailsGroup, details);

        // 先に他のメニューを閉じる(PC時メガメニューの場合はアニメーション無し)
        if (hasOtherOpen) {
          //console.log("他閉じる・即時");
          this._closeOthersInGroup(detailsGroup, details, isMegamenu);
        }

        // 開く処理: PC時メガメニュー + 他が開いていた場合は即座に開く
        //if (isMegamenu && hasOtherOpen) {
        //  25.10.25 演出が変更され即時開く
        if (isMegamenu) {
          //console.log("開く処理・即時");
          this._openInstant(details, panel, detailsGroup);
        } else {
          // 通常(SP時 or 他が開いていない時): アニメーション付きで開く
          //console.log("開く処理・アニメ");
          this._openWithAnimation(details, panel, detailsGroup);
        }
      } else {
        // --- 閉じる処理 ---
        // 常にアニメーション付きで閉じる
        //console.log("閉じる処理・アニメ");
        this._closeWithAnimation(details, panel, detailsGroup);
      }
    };

    summary.addEventListener('click', clickHandler, false);

    info.clickHandler = clickHandler;
    info.isActive = true;
    info.isInitialized = true;
  }

  //---------------------------------------------
  // details の初期化を解除
  // イベントリスナーを削除してアクティブ状態を無効化
  //---------------------------------------------
  uninitializeDetails(info) {
    if (!info.isInitialized) { info.isActive = false; return; }
    const { summary, clickHandler } = info;
    if (summary && clickHandler) summary.removeEventListener('click', clickHandler);
    info.clickHandler = null;
    info.isInitialized = false;
    info.isActive = false;
  }

  //---------------------------------------------
  // レスポンシブ変化時の処理
  // ブレークポイント切替時に初期化状態を更新し、全detailsを閉じる
  //---------------------------------------------
  handleResponsiveChange() {
    // 印刷中はレスポンシブ変化を無視
    if (this.isPrinting) return;

    this.accordions.forEach(info => {
      if (info.isPlain) return; // プレーンは常に扱い変えない（ただし後で強制closeする）
      const should = this.shouldBeActive(info.responsiveType);
      if (info.isActive && !should) this.uninitializeDetails(info);
      else if (!info.isActive && should) this._initializeSingle(info);
    });
    this.updateOutsideClickWrappers();
    // 幅切り替え時: 表示状態のズレ(アイコンが開状態表示のまま等)を防ぐため全 details を非アニメで強制閉じ
    this._forceCloseAllDetailsOnBreakpointChange();
  }

  //---------------------------------------------
  // ブレークポイント切替時に全 details を強制クリア
  // SP/PC切替時の状態齟齬を防ぐため、open属性とスタイルをリセット
  //---------------------------------------------
  _forceCloseAllDetailsOnBreakpointChange() {
    this.accordions.forEach(info => {
      const { element: details, panel } = info;
      if (!details) return;
      // 開いている/開いていたフラグを全てクリア
      if (details.hasAttribute('open')) details.removeAttribute('open');
      if (details.hasAttribute('data-open')) details.removeAttribute('data-open');
      // パネルのインラインスタイルで残存高さがあればクリア（即時閉じ状態にする）
      if (panel) {
        panel.style.overflow = '';
        panel.style.maxBlockSize = '';
      }
    });
    // アニメ中フラグを念のため解除
    this.isAnimating = false;
  }

  //---------------------------------------------
  // ラッパー要素の外側クリック・ESCキーで閉じる処理を設定
  // ドロップダウンメニューなどで使用
  //---------------------------------------------
  setupOutsideClickClose(wrapper, responsiveType) {
    if (wrapper.dataset.outsideCloseBound === '1') return;
    const wrapperInfo = { wrapper, responsiveType, isActive: this.shouldBeActive(responsiveType), outsideHandler: null, escHandler: null };

    const outsideHandler = (event) => {
      if (!wrapperInfo.isActive) return;
      if (wrapper.contains(event.target)) return;
      this.accordions.forEach(info => {
        if (!wrapper.contains(info.element)) return;
        if (!info.element.open) return;
        // アニメーション未初期化（プレーン or 非アクティブ）でも直接閉じる
        if (info.element.contains(document.activeElement)) info.summary?.focus({ preventScroll: true });
        if (info.isInitialized && info.isActive && !info.isPlain) {
          this._closeWithAnimation(info.element, info.panel, info.detailsGroup);
        } else {
          info.element.open = false;
          info.element.removeAttribute('data-open');
        }
      });
    };

    const escHandler = (event) => {
      if (!wrapperInfo.isActive) return;
      if (event.key !== 'Escape') return;
      if (!wrapper.contains(document.activeElement)) return;
      let lastSummary = null;
      this.accordions.forEach(info => {
        if (!wrapper.contains(info.element)) return;
        if (!info.element.open) return;
        lastSummary = info.summary;
        if (info.isInitialized && info.isActive && !info.isPlain) {
          this._closeWithAnimation(info.element, info.panel, info.detailsGroup);
        } else {
          info.element.open = false;
          info.element.removeAttribute('data-open');
        }
      });
      if (lastSummary) lastSummary.focus({ preventScroll: true });
    };

    document.addEventListener('pointerdown', outsideHandler, true);
    document.addEventListener('keyup', escHandler, false);

    wrapperInfo.outsideHandler = outsideHandler;
    wrapperInfo.escHandler = escHandler;
    this.outsideCloseWrappers.push(wrapperInfo);
    wrapper.dataset.outsideCloseBound = '1';
  }

  //---------------------------------------------
  // 外側クリック監視ラッパーのアクティブ状態を更新
  // レスポンシブ変化時に呼び出される
  //---------------------------------------------
  updateOutsideClickWrappers() {
    this.outsideCloseWrappers.forEach(wi => { wi.isActive = this.shouldBeActive(wi.responsiveType); });
  }

  // ========================================
  // アニメーション制御メソッド
  // ========================================

  //---------------------------------------------
  // アニメーション付きで開く
  // maxBlockSize を 0 → 実際の高さ へアニメーション
  //---------------------------------------------
  _openWithAnimation(details, panel, detailsGroup) {
    // 個別の要素にアニメーション中フラグを設定(複数同時アニメーション対応)
    if (details._isOpening) return;
    details._isOpening = true;

    // 一時的に data-group を外す(アニメーション中の排他制御を避けるため)
    if (detailsGroup) details.removeAttribute('data-group');

    details.setAttribute('data-open', 'true');
    details.open = true;
    panel.style.overflow = 'clip';

    // detailsのラッパーにdata-has-openフラグを更新
    const wrapper = details.closest('.js-details-wrap');
    this.updateWrapperHasOpenFlag(wrapper);

    const { blockSize } = window.getComputedStyle(panel);
    const keyframes = [{ maxBlockSize: '0' }, { maxBlockSize: blockSize }];
    //    const { marginTop } = window.getComputedStyle(panel);
    //    console.log(`marginTop: ${marginTop}`);
    //    const keyframes = [{ marginTop: '0' }, { marginTop: '40' }];
    const isPrefersReduced = responsive.prefersReducedMotion();
    const animationOptions = {
      duration: isPrefersReduced ? 0 : Math.max(0, this.options.duration || 0),
      easing: this.options.easing
    };

    const onAnimationEnd = () => {
      requestAnimationFrame(() => {
        // アニメーション後のスタイルをクリア(フォーカス可能にするため)
        panel.style.overflow = '';
        panel.style.maxBlockSize = '';
        panel.style.opacity = '';
        panel.style.marginTop = '';
        if (detailsGroup) details.setAttribute('data-group', detailsGroup);
        delete details._isOpening;
      });
    };

    requestAnimationFrame(() => {
      const animation = panel.animate(keyframes, animationOptions);
      animation.addEventListener('finish', onAnimationEnd);
    });
  }

  //---------------------------------------------
  // アニメーション付きで閉じる
  // maxBlockSize を 実際の高さ → 0 へアニメーション
  //---------------------------------------------
  _closeWithAnimation(details, panel, detailsGroup) {
    // 個別の要素にアニメーション中フラグを設定(複数同時アニメーション対応)
    if (details._isClosing) return;
    details._isClosing = true;

    if (detailsGroup) details.removeAttribute('data-group');

    details.removeAttribute('data-open');
    panel.style.overflow = 'clip';

    // detailsのラッパーにdata-has-openフラグを更新
    const wrapper = details.closest('.js-details-wrap');
    this.updateWrapperHasOpenFlag(wrapper);

    const { blockSize } = window.getComputedStyle(panel);
    const keyframes = [{ maxBlockSize: blockSize }, { maxBlockSize: '0' }];
    //    const { opacity } = window.getComputedStyle(panel);
    //    console.log(`opacity: ${opacity}, duration: ${this.options.duration}`);
    //    const keyframes = [{ opacity: '1' }, { opacity: '0' }];
    const isPrefersReduced = responsive.prefersReducedMotion();
    const animationOptions = {
      duration: isPrefersReduced ? 0 : Math.max(0, this.options.duration || 0),
      easing: this.options.easing
    };

    const onAnimationEnd = () => {
      //console.log("finish登録中");
      requestAnimationFrame(() => {
        //console.log("finishした");
        // アニメーション後のスタイルをクリア
        panel.style.overflow = '';
        panel.style.maxBlockSize = '';
        panel.style.opacity = '';
        panel.style.marginTop = '';
        details.open = false;
        if (detailsGroup) details.setAttribute('data-group', detailsGroup);
        delete details._isClosing;
      });
    };

    requestAnimationFrame(() => {
      const animation = panel.animate(keyframes, animationOptions);
      //console.log("finsh登録前");
      animation.addEventListener('finish', onAnimationEnd);
    });
  }

  //---------------------------------------------
  // アニメーション無しで即座に開く
  // メガメニューのPC表示で使用
  //---------------------------------------------
  _openInstant(details, panel, detailsGroup) {
    if (detailsGroup) details.removeAttribute('data-group');

    details.setAttribute('data-open', 'true');
    details.open = true;
    panel.style.maxBlockSize = '';
    panel.style.overflow = '';
    panel.style.opacity = '';
    panel.style.marginTop = '';

    if (detailsGroup) details.setAttribute('data-group', detailsGroup);
    // detailsのラッパーにdata-has-openフラグを更新
    const wrapper = details.closest('.js-details-wrap');
    this.updateWrapperHasOpenFlag(wrapper);
  }

  //---------------------------------------------
  // アニメーション無しで即座に閉じる
  // メガメニューのPC表示で使用
  //---------------------------------------------
  _closeInstant(details, panel, detailsGroup, isCheckaHasOpen = true) {
    if (detailsGroup) details.removeAttribute('data-group');

    details.removeAttribute('data-open');
    details.open = false;
    panel.style.maxBlockSize = '';
    panel.style.overflow = '';
    panel.style.opacity = '';
    panel.style.marginTop = '';
    //    panel.style.maxBlockSize = '0';
    //    panel.style.overflow = 'clip';

    if (detailsGroup) details.setAttribute('data-group', detailsGroup);
    // detailsのラッパーにdata-has-openフラグを更新
    const wrapper = details.closest('.js-details-wrap');
    if (isCheckaHasOpen) this.updateWrapperHasOpenFlag(wrapper);
  }

  // ========================================
  // グループ制御メソッド
  // ========================================

  //---------------------------------------------
  // グループ内に開いている他の details があるかチェック
  // 排他制御用（現在の要素以外に開いているものがあるか）
  //---------------------------------------------
  _hasOpenInGroup(detailsGroup, currentDetails) {
    const groupMembers = document.querySelectorAll(`details[data-group="${detailsGroup}"][open]`);
    return Array.from(groupMembers).some(el => el !== currentDetails);
  }

  //---------------------------------------------
  // グループ内の他の details を閉じる
  // 排他制御の実行（現在の要素以外を閉じる）
  // instant=true でアニメーション無し
  //---------------------------------------------
  _closeOthersInGroup(detailsGroup, currentDetails, instant = false) {
    if (!detailsGroup) return;

    const otherDetails = document.querySelector(`details[data-group="${detailsGroup}"][open]`);
    if (!otherDetails || otherDetails === currentDetails) return;

    const otherPanel = otherDetails.querySelector('summary + *');
    if (!otherPanel) return;

    // メガメニューの場合は即座に閉じる、それ以外はアニメーション付き
    if (instant) {
      this._closeInstant(otherDetails, otherPanel, detailsGroup, false);
    } else {
      this._closeWithAnimation(otherDetails, otherPanel, detailsGroup);
    }
  }

  //---------------------------------------------
  // 指定グループの全アコーディオンを閉じる（外部API）
  // mobile_menu.js や scrollevent.js から呼ばれる
  // exceptElement: 除外する要素 / instant: アニメ無しフラグ
  //---------------------------------------------
  closeAllByGroup(groupName, exceptElement = null, instant = false) {
    this.accordions.forEach(info => {
      // グループが一致しない、または除外対象
      if (!info.detailsGroup || info.detailsGroup !== groupName) return;
      if (info.element === exceptElement) return;

      // 開いていないものはスキップ
      if (!info.element.open) return;

      // アニメーション初期化済みかつアクティブな場合
      if (info.isInitialized && info.isActive && !info.isPlain) {
        // instant フラグに応じて即座に閉じるかアニメーション付きで閉じるかを選択
        if (instant) {
          this._closeInstant(info.element, info.panel, info.detailsGroup);
        } else {
          this._closeWithAnimation(info.element, info.panel, info.detailsGroup);
        }
      } else {
        // 非アニメ対象は直接 open 解除
        info.element.open = false;
        info.element.removeAttribute('data-open');
      }
    });
  }

  // ========================================
  // 初期状態設定
  // ========================================

  //---------------------------------------------
  // 初期読み込み時: accordion グループの最初の項目のみ開く
  // megamenu は除外（全て閉じた状態を維持）
  // グループごとに DOM 上で最初に出現した details だけに open 付与
  //---------------------------------------------
  _setInitialOpenState() {
    // グループごとに最初の details を記録
    const firstInGroup = new Map();

    // DOM順で全 details を走査
    this.accordions.forEach(info => {
      const { element: details, detailsGroup } = info;
      if (!details || !detailsGroup) return;

      // megamenu は除外
      const wrapperType = details.__wrapperType || 'accordion';
      if (wrapperType === 'megamenu') return;

      // このグループで初出現なら記録
      if (!firstInGroup.has(detailsGroup)) {
        firstInGroup.set(detailsGroup, details);
      }
    });

    // 全 details を走査して open 状態を設定
    this.accordions.forEach(info => {
      const { element: details, detailsGroup } = info;
      if (!details || !detailsGroup) return;

      const wrapperType = details.__wrapperType || 'accordion';
      if (wrapperType === 'megamenu') return;

      // グループの最初の要素かチェック
      if (firstInGroup.get(detailsGroup) === details) {
        details.setAttribute('data-open', 'true');
        details.open = true;
      } else {
        details.removeAttribute('data-open');
        details.open = false;
      }
    });

    // 全ラッパーの data-has-open フラグを更新
    const wrappers = document.querySelectorAll('.js-details-wrap');
    wrappers.forEach(wrapper => this.updateWrapperHasOpenFlag(wrapper));
  }

  // ========================================
  // 印刷対応
  // ========================================

  //---------------------------------------------
  // ラッパーごとに印刷時の開閉制御ハンドラーを設定
  // data-print-open 属性をチェック（未指定時は wrapperType で判定）
  // デフォルト: accordion=true / megamenu=false
  //---------------------------------------------
  _setupPrintHandlers(wrapper) {
    const wrapperType = wrapper.getAttribute('data-type') || 'accordion';

    // data-print-open 属性の値を取得
    const printOpenAttr = wrapper.getAttribute('data-print-open');

    // 印刷時に開くかどうかを判定
    let shouldPrintOpen;
    if (printOpenAttr !== null) {
      // 属性が明示的に指定されている場合はその値を使用
      shouldPrintOpen = printOpenAttr === 'true';
    } else {
      // 未指定の場合はデフォルト判定: accordion=true, megamenu=false
      shouldPrintOpen = wrapperType === 'accordion';
    }

    if (!shouldPrintOpen) return;

    // このラッパー内の全 details を対象にハンドラーを設定
    const detailsElements = wrapper.querySelectorAll('details');

    const beforePrintHandler = () => {
      this.isPrinting = true; // 印刷中フラグを立てる
      detailsElements.forEach(details => {
        const detailsGroup = details.getAttribute('data-group');
        const currentOpen = details.open;
        // 元の開閉状態とグループ名を保存
        details.setAttribute('data-open-status', String(currentOpen));
        if (detailsGroup) {
          details.setAttribute('data-group-backup', detailsGroup);
          details.removeAttribute('data-group');
        }
        details.open = true;
        details.setAttribute('data-open', 'true');
      });
    };

    const afterPrintHandler = () => {
      // ブラウザの状態リセットが完了するまで少し待つ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          detailsElements.forEach(details => {
            // アニメーション中フラグをクリア
            delete details._isOpening;
            delete details._isClosing;

            // パネル要素を取得してスタイルをクリア
            const panel = details.querySelector('summary + *');
            if (panel) {
              panel.style.overflow = '';
              panel.style.maxBlockSize = '';
              panel.style.opacity = '';
              panel.style.marginTop = '';
            }

            // 開閉状態を復元（data-group を戻す前に行う）
            const wasOpen = details.getAttribute('data-open-status') === 'true';

            // 強制的に状態を設定（ブラウザが勝手に変更している可能性があるため）
            details.open = wasOpen;
            if (wasOpen) {
              details.setAttribute('data-open', 'true');
            } else {
              details.removeAttribute('data-open');
            }

            // グループ名を復元（開閉状態の復元後に行う）
            const backupGroup = details.getAttribute('data-group-backup');
            if (backupGroup) {
              details.setAttribute('data-group', backupGroup);
              details.removeAttribute('data-group-backup');
            }

            details.removeAttribute('data-open-status');
          });

          // ラッパーの data-has-open フラグを更新
          this.updateWrapperHasOpenFlag(wrapper);

          // 印刷中フラグを少し遅らせて解除（レスポンシブイベントが落ち着くまで待つ）
          setTimeout(() => {
            this.isPrinting = false;
          }, 200);
        });
      });
    };

    window.addEventListener('beforeprint', beforePrintHandler);
    window.addEventListener('afterprint', afterPrintHandler);
  }
}
