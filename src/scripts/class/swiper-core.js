// =========================================================
//
//  Swiper 制御基盤クラス
//  目的: スライダー制御ロジックを集約(パターン生成から分離)
//
// =========================================================
import { responsive } from '../utils/responsive.js';

export default class SwiperCore {
  constructor() {
    this.swipers = {};
    this.mediaWatchers = {};

    // 印刷時の挙動切り替えフラグ
    // true: 完全破棄して再初期化(クリーン・重い)
    // false: 自動再生のみ停止(軽量・フラグが残る可能性)
    this.destroyOnPrint = true;

    this._setupPrintHandlers();
  }

  //========================================
  // 印刷対応
  //========================================

  /**
   * 印刷時のSwiper制御をセットアップ
   * 目的: 印刷中にスライドが動くと表示が不安定になるのを防ぐ
   * 
   * モード1 (destroyOnPrint=true): 完全破棄→再初期化
   *   メリット: フラグやイベントが完全にクリーンアップされる
   *   デメリット: 再初期化の処理が必要、少し重い
   * 
   * モード2 (destroyOnPrint=false): 自動再生のみ停止
   *   メリット: 軽量、シンプル
   *   デメリット: 内部フラグが残る可能性がある
   */
  _setupPrintHandlers() {
    if (this.destroyOnPrint) {
      // モード1: 完全破棄版
      window.addEventListener('beforeprint', () => {
        // 再初期化用のスナップショットを保存
        Object.entries(this.swipers).forEach(([name, swiper]) => {
          if (!swiper || swiper.destroyed) return;

          const snapshot = {
            el: swiper.el,
            activeIndex: swiper.realIndex ?? swiper.activeIndex,
            params: swiper.params,
            hadAutoplay: swiper.autoplay?.running ?? false
          };

          swiper._printSnapshot = snapshot;

          // 完全破棄(DOM構造は保持、イベント・状態はクリア)
          swiper.destroy(false, false);
        });
      });

      window.addEventListener('afterprint', () => {
        // スナップショットから再初期化
        Object.entries(this.swipers).forEach(([name, swiper]) => {
          const snapshot = swiper?._printSnapshot;
          if (!snapshot) return;

          // 新しいSwiperインスタンスを作成
          const newSwiper = new Swiper(snapshot.el, snapshot.params);

          // アクティブスライドを復元
          if (snapshot.activeIndex > 0) {
            newSwiper.slideToLoop?.(snapshot.activeIndex, 0, false) ??
              newSwiper.slideTo?.(snapshot.activeIndex, 0, false);
          }

          // 自動再生を復元
          if (snapshot.hadAutoplay && newSwiper.autoplay) {
            newSwiper.autoplay.start();
          }

          // インスタンスを置き換え
          this.swipers[name] = newSwiper;
        });
      });

    } else {
      // モード2: 自動再生停止のみ(軽量版)
      window.addEventListener('beforeprint', () => {
        Object.values(this.swipers).forEach(swiper => {
          if (swiper?.autoplay?.running) {
            swiper.autoplay.stop();
            swiper._wasPausedForPrint = true;
          }
        });
      });

      window.addEventListener('afterprint', () => {
        Object.values(this.swipers).forEach(swiper => {
          if (swiper?._wasPausedForPrint) {
            swiper.autoplay?.start?.();
            swiper._wasPausedForPrint = false;
          }
        });
      });
    }
  }

  //========================================
  // スライド複製管理
  //========================================

  // 元スライド数を取得（複製を除外）
  _getOriginalSlides(el) {
    const wrapper = el.querySelector('.swiper-wrapper');
    if (!wrapper) return [];

    // Swiper本体の複製（.swiper-slide-duplicate）と手動複製（.swiper-slide--clone）を除外
    const clones = wrapper.querySelectorAll('.swiper-slide--clone, .swiper-slide-duplicate');
    if (clones.length > 0) {
      return Array.from(wrapper.querySelectorAll('.swiper-slide:not(.swiper-slide--clone):not(.swiper-slide-duplicate)'));
    }
    return Array.from(wrapper.querySelectorAll('.swiper-slide'));
  }

  // ループに必要な枚数まで複製（目標枚数に満たない場合のみ）
  ensureLoopable(el, minTotal = 3) {
    const wrapper = el.querySelector('.swiper-wrapper');
    if (!wrapper) return;

    const originals = this._getOriginalSlides(el);
    const total = wrapper.querySelectorAll('.swiper-slide').length;

    // 既に満たしていれば何もしない（再初期化時の増殖防止）
    if (total >= minTotal || originals.length === 0) return;

    const needed = minTotal - total;
    const times = Math.ceil(needed / originals.length);

    for (let i = 0; i < times; i++) {
      originals.forEach(slide => {
        const clone = slide.cloneNode(true);
        clone.classList.add('swiper-slide--clone');

        // アクセシビリティ対応: クローンのタブフォーカスをカット
        // - inert: クリック選択ができなくなるため、代わりにクローン内の focusable 要素を無効化
        // - aria-hidden: スクリーンリーダーから除外
        // 目的: Tab キーでのフォーカス移動によるスライド自動切り替え防止
        clone.setAttribute('aria-hidden', 'true');
        this._disableTabFocusInSlide(clone);

        wrapper.appendChild(clone);
      });
    }
  }

  /**
   * スライド内の focusable 要素からタブフォーカスをカット
   * クリック・タップは機能したままにする
   * 目的: Tab キーでのフォーカス移動によるスライド自動切り替え防止
   * 
   * @param {HTMLElement} slide - 対象スライド要素
   */
  _disableTabFocusInSlide(slide) {
    // a, button, input, select, textarea, [tabindex] を対象
    const focusableElements = slide.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]'
    );

    focusableElements.forEach(el => {
      el.setAttribute('tabindex', '-1');
    });
  }

  //========================================
  // クラス操作（距離・方向・アニメーション）
  //========================================

  // 距離クラス削除
  _clearDistanceClasses(slides) {
    const classes = [
      'swiper-slide-prev-2', 'swiper-slide-prev-3', 'swiper-slide-prev-4',
      'swiper-slide-next-2', 'swiper-slide-next-3', 'swiper-slide-next-4'
    ];
    slides.forEach(s => s.classList.remove(...classes));
  }

  // 距離クラス追加（アクティブからの距離に応じたクラス付与）
  addDistanceClasses(swiper) {
    const slides = swiper.slides;
    const active = swiper.activeIndex;
    const total = slides.length;

    this._clearDistanceClasses(slides);

    slides.forEach((slide, i) => {
      let dist = i - active;
      // ループ考慮
      if (Math.abs(dist) > total / 2) {
        dist = dist > 0 ? dist - total : dist + total;
      }

      const map = {
        '-2': 'swiper-slide-prev-2',
        '-3': 'swiper-slide-prev-3',
        '-4': 'swiper-slide-prev-4',
        '2': 'swiper-slide-next-2',
        '3': 'swiper-slide-next-3',
        '4': 'swiper-slide-next-4'
      };
      if (map[dist]) slide.classList.add(map[dist]);
    });
  }

  // 方向クラス削除
  _clearDirectionClasses(slides) {
    const classes = ['swiper-slide-in', 'swiper-slide-out', 'swiper-slide-in-init', 'swiper-slide-out-init'];
    slides.forEach(s => s.classList.remove(...classes));
  }

  // 方向クラス追加（前進/後退でin/outを判定）
  addDirectionClasses(swiper, isForward) {
    const slides = swiper.slides;
    this._clearDirectionClasses(slides);

    slides.forEach((slide, i) => {
      const cls = slide.classList;
      let type = null;

      if (isForward) {
        if (cls.contains('swiper-slide-next-2')) type = 'in';
        else if (cls.contains('swiper-slide-prev')) type = 'out';
      } else {
        if (cls.contains('swiper-slide-prev-2')) type = 'in';
        else if (cls.contains('swiper-slide-next')) type = 'out';
      }

      if (type) this._addSlideAnimation(slide, type);
    });
  }

  // アニメーションクラス追加（2フレーム後にinit削除）
  _addSlideAnimation(slide, type) {
    const initClass = `swiper-slide-${type}-init`;
    const animClass = `swiper-slide-${type}`;

    slide.classList.add(initClass, animClass);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        slide.classList.remove(initClass);
      });
    });
  }

  //========================================
  // オプション生成ヘルパー
  //========================================

  // ページネーション生成（元スライド数分のみbullet描画）
  buildPagination(el, originalCount = null) {
    const paginationEl = el.querySelector('.swiper-pagination');
    if (!paginationEl) return {};

    const count = originalCount ?? this._getOriginalSlides(el).length;

    return {
      pagination: {
        el: paginationEl,
        clickable: false, // イベントは別途attachで制御
        type: 'bullets',
        bulletActiveClass: 'swiper-pagination-bullet-active-swiper',
        renderBullet: (index, className) => {
          if (index < count) {
            return `<button type="button" class="${className}" data-target="${index}"><span></span></button>`;
          }
          return '';
        }
      }
    };
  }

  // ナビゲーション生成
  buildNavigation(el) {
    const next = el.querySelector('.swiper-button-next');
    const prev = el.querySelector('.swiper-button-prev');

    if (!next && !prev) return {};

    return {
      navigation: {
        nextEl: next || undefined,
        prevEl: prev || undefined
      }
    };
  }

  // オートプレイ生成
  buildAutoplay(enable, delay = 3000) {
    if (!enable) return {};

    return {
      autoplay: {
        delay,
        disableOnInteraction: false,
        pauseOnMouseEnter: false
      }
    };
  }

  //========================================
  // データトリガー制御
  //========================================

  /**
   * data-anim-mode属性を持つ要素のis-activeクラス制御
   * @param {object} swiper - Swiperインスタンス
   * @param {string} mode - data-anim-mode属性の値（例: "slide"）
   * 
   * 用途例:
   * - data-anim-mode="slide" でスライド切り替え時にアニメーション発火
   * - StaggerTextなど、スライド内の要素をアクティブスライドでのみアニメーションさせる
   */
  toggleTriggerElements(swiper, mode = 'slide') {
    const selector = `[data-anim-mode="${mode}"]`;

    // 全スライドのmode要素からis-activeを削除
    swiper.slides.forEach(slide => {
      const elements = slide.querySelectorAll(selector);
      elements.forEach(elem => elem.classList.remove('is-active'));
    });

    // アクティブスライドのmode要素にis-activeを付与
    const currentSlide = swiper.slides[swiper.activeIndex];
    //console.log( currentSlide);
    if (currentSlide) {
      const triggerElements = currentSlide.querySelectorAll(selector);
      triggerElements.forEach(elem => elem.classList.add('is-active'));
    }
  }

  //========================================
  // イベントハンドラ
  //========================================

  _updatePaginationState(swiper, paginationEl, originalCount) {
    const bullets = paginationEl.querySelectorAll('.swiper-pagination-bullet');
    const guiIndex = swiper.realIndex % originalCount;
    const currentPage = Math.floor(swiper.realIndex / originalCount);

    bullets.forEach((bullet, idx) => {
      bullet.classList.toggle('swiper-pagination-bullet-active', idx === guiIndex);
      bullet.setAttribute('data-target', String(currentPage * originalCount + idx));
    });
  }

  // ページネーションのクリック制御（loop/non-loop両対応）
  attachPaginationHandler(swiper, el, originalCount) {
    const paginationEl = el.querySelector('.swiper-pagination');
    if (!paginationEl) return;

    this._updatePaginationState(swiper, paginationEl, originalCount);

    // クリックで移動
    paginationEl.addEventListener('click', (e) => {
      const bullet = e.target?.closest?.('.swiper-pagination-bullet');
      if (!bullet || !paginationEl.contains(bullet)) return;

      e.preventDefault();
      e.stopPropagation();

      const target = parseInt(bullet.getAttribute('data-target'), 10);
      if (isNaN(target)) return;

      if (swiper.params?.loop) {
        swiper.slideToLoop(target);
      } else {
        swiper.slideTo(target);
      }
    });

    // スライド変更時に見た目用activeとdata-targetを更新
    swiper.on('slideChange', () => {
      this._updatePaginationState(swiper, paginationEl, originalCount);
    });
  }

  // 一時停止/再生ボタン
  attachPauseButton(swiper, el) {
    const btn = el.querySelector('.swiper-btn-pause');
    if (!btn) return;

    let playing = true;

    btn.addEventListener('click', () => {
      if (playing) {
        swiper.autoplay?.stop?.();
        el.classList.add('is-paused');
        btn.classList.add('is-paused');
        btn.setAttribute('aria-label', '自動再生の開始');
      } else {
        swiper.autoplay?.start?.();
        el.classList.remove('is-paused');
        btn.classList.remove('is-paused');
        btn.setAttribute('aria-label', '自動再生の停止');
      }
      playing = !playing;
    });
  }

  //========================================
  // レスポンシブ制御・枚数判定
  //========================================

  /**
   * 枚数判定（PC/SPで閾値変更）
   * @param {number} count - スライド枚数
   * @param {number} minPC - PC時の最小枚数
   * @param {number} minSP - SP時の最小枚数
   * @returns {boolean} 初期化すべきか
   */
  shouldInitSwiper(count, minPC = 4, minSP = 2) {
    return responsive.isMobile() ? count >= minSP : count >= minPC;
  }

  /**
   * リサイズ対応初期化（PC/SPで閾値変更、リサイズで再判定）
   * @param {HTMLElement} el - スライダー要素（.swiper要素）
   * @param {string} name - インスタンス名
   * @param {Function} factory - 初期化関数
   * @param {number} minPC - PC時の最小枚数
   * @param {number} minSP - SP時の最小枚数
   */
  mountWithResize(el, name, factory, minPC = 4, minSP = 2) {
    const wrapper = el.querySelector('.swiper-wrapper');

    // 初回のみ元のDOM状態とクラスを保存
    if (!el._originalState) {
      el._originalState = {
        wrapperHTML: wrapper.innerHTML,
        swiperClasses: el.className, // .swiper要素のクラス全体を保存
        slideCount: this._getOriginalSlides(el).length
      };
    }

    const count = el._originalState.slideCount;

    const handler = () => {
      const shouldInit = this.shouldInitSwiper(count, minPC, minSP);

      // 既存インスタンスがあれば破棄
      if (this.swipers[name]) {
        this.swipers[name].destroy(true, true);
        delete this.swipers[name];
      }

      // DOM とクラスを初期状態に完全復元
      wrapper.innerHTML = el._originalState.wrapperHTML;
      el.className = el._originalState.swiperClasses;

      if (shouldInit) {
        factory();
      } else {
        el.classList.add('is-card-list');
      }
    };

    // リサイズイベント登録（初回のみ）
    if (!el._swiperResizeHandler) {
      el._swiperResizeHandler = handler;
      responsive.onChange(handler);
    }

    handler(); // 初回実行
  }

  // SP専用マウント(768px以下のみ)
  mountSpOnly(el, name, factory) {
    let watcher = this.mediaWatchers[name];

    if (!watcher) {
      // responsive.jsを使用してブレークポイント判定を一元管理
      const handler = () => {
        if (responsive.isMobile()) {
          if (!this.swipers[name]) {
            factory();
          }
        } else {
          if (this.swipers[name]) {
            this.swipers[name].destroy(true, true);
            delete this.swipers[name];
          }
        }
      };

      // responsive.onChange()で変更を監視
      const unsubscribe = responsive.onChange(handler);
      this.mediaWatchers[name] = { handler, unsubscribe };

      handler(); // 初回実行
    } else {
      watcher.handler(); // 既存の再評価
    }
  }

  //========================================
  // クリーンアップ
  //========================================

  /**
   * 全てのSwiperとイベントリスナーを破棄
   */
  destroy() {
    // 全てのSwiperインスタンスを破棄
    Object.values(this.swipers).forEach(swiper => {
      if (swiper && !swiper.destroyed) {
        swiper.destroy(true, true);
      }
    });
    this.swipers = {};

    // responsive.onChange()のイベントリスナーを解除
    Object.values(this.mediaWatchers).forEach(watcher => {
      if (watcher.unsubscribe) {
        watcher.unsubscribe();
      }
    });
    this.mediaWatchers = {};
  }
}
