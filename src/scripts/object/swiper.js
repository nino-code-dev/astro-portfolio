// =========================================================
//
//  Swiper パターン生成グループ
//  目的: プロジェクト固有のスライダーパターンを提供
//
//  印刷時の挙動切り替え:
//    this.destroyOnPrint = true;  // 完全破棄版(デフォルト・推奨)
//    this.destroyOnPrint = false; // 自動再生停止のみ(軽量版)
//
// =========================================================

import SwiperCore from '../class/swiper-core.js';

export default class SwiperGroup extends SwiperCore {
  constructor() {
    super();
    // 印刷時の挙動を切り替える場合はここで設定
    // this.destroyOnPrint = false; // 軽量版に切り替える場合
  }


  //========================================
  // パターン生成: default
  // PC:4枚以上、SP:2枚以上で初期化（引数で調整可）
  // 流れ: mount -> (必要時のみloop補正) -> 共通オプション生成 -> Swiper生成 -> 各種ハンドラ接続
  //========================================
  make_slider_default(el, name, autoplay = true, options = {}, minPC = 4, minSP = 2, dataOptions = {}) {
    const self = this;

    this.mountWithResize(el, name, () => {
      const loop = options.loop ?? false;
      const originals = this._getOriginalSlides(el);
      const originalCount = originals.length;

      const userOn = options.on || {};
      const userInit = userOn.init;
      const userSlideStart = userOn.slideChangeTransitionStart;
      const userSlideEnd = userOn.slideChangeTransitionEnd;

      if (loop) this.ensureLoopable(el, 9);

      const swiper = new Swiper(el, {
        loop,
        slidesPerView: 'auto',
        centeredSlides: false,
        speed: 300,
        watchSlidesProgress: true,
        ...this.buildPagination(el, originalCount),
        ...this.buildNavigation(el),
        ...this.buildAutoplay(autoplay),
        ...options,
        // data-offset-before は初期化時オプションとしてのみ扱う
        ...dataOptions,
        on: {
          ...userOn,
          init: function() {
            this.slides.forEach(slide => {
              self._disableTabFocusInSlide(slide);
            });

            if (typeof userInit === 'function') {
              userInit.call(this);
            }
          },
          slideChangeTransitionStart: function() {
            if (typeof userSlideStart === 'function') {
              userSlideStart.call(this);
            }
          },
          slideChangeTransitionEnd: function() {
            if (typeof userSlideEnd === 'function') {
              userSlideEnd.call(this);
            }
          }
        }
      });

      this.attachPaginationHandler(swiper, el, originalCount);
      this.attachPauseButton(swiper, el);
      this.swipers[name] = swiper;
    }, minPC, minSP);
  }

  //========================================
  // パターン生成: default (SP専用)
  // SP:2枚以上で初期化（引数で調整可）
  // default と同じオプション解決を使い、分岐差分は「SP判定」のみ
  //========================================
  make_slider_default_sp(el, name, autoplay = true, options = {}, minSP = 2, dataOptions = {}) {
    const self = this;
    const loop = options.loop ?? true;

    this.mountSpOnly(el, name, () => {
      const originals = this._getOriginalSlides(el);
      const originalCount = originals.length;

      const userOn = options.on || {};
      const userInit = userOn.init;
      const userSlideStart = userOn.slideChangeTransitionStart;
      const userSlideEnd = userOn.slideChangeTransitionEnd;

      // 枚数判定（SP時のみ）
      if (originalCount < minSP) {
        el.classList.add('is-card-list');
        return;
      }
      el.classList.remove('is-card-list');

      if (loop) this.ensureLoopable(el, 9);

      const swiper = new Swiper(el, {
        loop,
        slidesPerView: 'auto',
        centeredSlides: true,
        speed: 300,
        watchSlidesProgress: true,
        ...this.buildPagination(el, originalCount),
        ...this.buildNavigation(el),
        ...this.buildAutoplay(autoplay),
        ...options,
        ...dataOptions,
        on: {
          ...userOn,
          init: function() {
            this.slides.forEach(slide => {
              self._disableTabFocusInSlide(slide);
            });

            if (typeof userInit === 'function') {
              userInit.call(this);
            }
          },
          slideChangeTransitionStart: function() {
            if (typeof userSlideStart === 'function') {
              userSlideStart.call(this);
            }
          },
          slideChangeTransitionEnd: function() {
            if (typeof userSlideEnd === 'function') {
              userSlideEnd.call(this);
            }
          }
        }
      });

      this.attachPaginationHandler(swiper, el, originalCount);
      this.attachPauseButton(swiper, el);
      this.swipers[name] = swiper;
      return swiper;
    });
  }

  //========================================
  // パターン生成: MV
  //========================================
  make_slider_mv(el, name, autoplay = true, options = {}) {
    const self = this;
    const originals = this._getOriginalSlides(el);
    const originalCount = originals.length;

    // 最小3枚まで複製
    this.ensureLoopable(el, originalCount * 4);

    let lastIndex = 0;

    const swiper = new Swiper(el, {
      loop: true,
      loopedSlides: originalCount,
      slidesPerView: 'auto',
      centeredSlides: true,
      spaceBetween: 0,
      watchSlidesProgress: true,
      ...this.buildPagination(el, originalCount),
      ...this.buildNavigation(el),
      ...this.buildAutoplay(autoplay, 5000),
      on: {
        init: function() {
          const firstActive = this.slides[this.activeIndex];
          if (firstActive) firstActive.classList.add('swiper-slide-first-active');

          // スライド内の focusable 要素のタブフォーカスをカット
          this.slides.forEach(slide => {
            self._disableTabFocusInSlide(slide);
          });
        },
        slideChangeTransitionStart: function() {
          const curr = this.activeIndex;
          const total = this.slides.length;
          let diff = curr - lastIndex;

          // ループ境界を考慮した方向判定
          const isForward = Math.abs(diff) > total / 2 ? diff < 0 : diff > 0;

          self.addDirectionClasses(this, isForward);
          lastIndex = curr;
        },
        slideChangeTransitionEnd: function() {
          el.querySelectorAll('.swiper-slide-first-active')
            .forEach(s => s.classList.remove('swiper-slide-first-active'));

          self._clearDirectionClasses(this.slides);
          self.addDistanceClasses(this);
        }
      },
      ...options
    });

    // 初期化後に距離クラス設定
    this.addDistanceClasses(swiper);
    lastIndex = swiper.activeIndex;

    // ページネーション制御
    this.attachPaginationHandler(swiper, el, originalCount);
    this.attachPauseButton(swiper, el);

    this.swipers[name] = swiper;
  }

  //========================================
  // MV フェード切り替え型
  // 用途: 1枚ずつフェードイン/アウトで切り替わるスライダー（操作不可・自動ループのみ）
  // 設定: effect: 'fade' で透明度切替、slidesPerView: 1 で1枚表示
  // 注意: ページネーション・ナビゲーション無効、触れない仕様
  // 特徴: swiper-slide-last-active クラスで「直前に表示していたスライド」を追跡可能
  //========================================
  make_slider_mv_fade(el, name, autoplay = true, options = {}) {
    // 直前のアクティブスライドを追跡
    let lastActiveSlide = null;

    // 最低2倍になるまで複製
    const originals = this._getOriginalSlides(el);
    const originalCount = originals.length;
    this.ensureLoopable(el, originalCount * 2);

    // クロージャで外側のthis（SwiperGroup）を保持
    const self = this;

    const swiper = new Swiper(el, {
      // フェード切り替えの必須設定
      effect: 'fade',              // フェードエフェクト有効化

      // 基本設定
      loop: true,                  // ループ有効
      speed: 1000,                 // フェード時間（ミリ秒）長めにすると滑らか

      // 操作無効化
      allowTouchMove: false,       // スワイプ操作を無効化

      // 自動再生（fadeとloopの組み合わせでは必須設定あり）
      autoplay: autoplay ? {
        delay: 5000,
        disableOnInteraction: false,  // ユーザー操作後も自動再生を継続
        pauseOnMouseEnter: false,
      } : false,

      // イベントハンドラで直前スライドを追跡
      on: {
        // スライド切り替え開始時
        slideChangeTransitionStart: function() {
          // 全スライドから last-active クラスを削除
          this.slides.forEach(slide => {
            slide.classList.remove('swiper-slide-last-active');
          });

          // 直前のアクティブスライドに last-active を付与
          if (lastActiveSlide) {
            lastActiveSlide.classList.add('swiper-slide-last-active');
          }

          // data-anim-mode="slide"要素のis-active制御（共通関数化）
          // this = Swiperインスタンス、self = SwiperGroup
          self.toggleTriggerElements(this, 'slide');
        },

        // スライド切り替え完了後
        slideChangeTransitionEnd: function() {
          // 現在のアクティブスライドを記録（次回の切り替え時に使用）
          lastActiveSlide = this.slides[this.activeIndex];
        },

        // 初回表示時
        init: function() {
          // 初回のアクティブスライドを記録
          lastActiveSlide = this.slides[this.activeIndex];

          // スライド内の focusable 要素のタブフォーカスをカット
          this.slides.forEach(slide => {
            self._disableTabFocusInSlide(slide);
          });

          // 初回のdata-anim-mode="slide"要素にis-activeを付与（共通関数化）
          self.toggleTriggerElements(this, 'slide');
        }
      },

      ...options  // ユーザー指定で上書き可能
    });

    // 一時停止ボタンの制御を追加
    this.attachPauseButton(swiper, el);

    this.swipers[name] = swiper;
  }

  //========================================
  // ページ中のdata記述を検出して登録
  //========================================
  register() {
    document.querySelectorAll('.swiper').forEach((el) => {
      const id = el.id || '';
      const autoplay = el.getAttribute('data-autoplay') !== 'false';
      const dataOptions = {};

      // 運用時に default 系の挙動を変える場合は、この data 属性マッピングを編集
      const centerAttr = el.getAttribute('data-center');
      if (centerAttr !== null) {
        dataOptions.centeredSlides = String(centerAttr).trim().toLowerCase() === 'true';
      }

      const offsetBeforeAttr = el.getAttribute('data-offset-before');
      if (offsetBeforeAttr !== null) {
        const parsedOffsetBefore = Number(String(offsetBeforeAttr).trim());
        if (Number.isFinite(parsedOffsetBefore) && parsedOffsetBefore >= 0) {
          dataOptions.slidesOffsetBefore = parsedOffsetBefore;
        }
      }

//      if (el.classList.contains('js-swiper-mv')) {
        //this.make_slider_mv(el, id, autoplay);
//      }
      if (el.classList.contains('js-swiper-mv-fade')) {
        this.make_slider_mv_fade(el, id, autoplay);
      }
      if (el.classList.contains('js-swiper-default')) {
        this.make_slider_default(el, id, autoplay, {}, 4, 2, dataOptions);
      }
      if (el.classList.contains('js-swiper-default-sp')) {
        this.make_slider_default_sp(el, id, autoplay, {}, 2, dataOptions);
      }
    });
  }
}

