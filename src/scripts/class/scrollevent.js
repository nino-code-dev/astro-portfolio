//----------------------------------------
//
//  スクロールイベント 個別処理
//
//----------------------------------------
export default class scroll_events {
  constructor(options = {}) {
    this.events = [];
    this.scroll_top = 0;
    this.scroll_bottom = 0;
    // スクロール方向検知用
    this.prev_scroll_top = 0;      // 前回のスクロール位置
    this.scroll_direction = null;  // 'up' | 'down' | null
    this.is_initialized = false;   // 初期化完了フラグ(ページロード直後の誤判定防止)

    //  中ボタンによる微細なスクロールで反応しなくなるので用途に注意
    this.threshold = 0;
    //this.threshold = 5; // スクロール判定の最小閾値(px) - 微細な揺れを無視

    // メガメニュー閉じる機能用
    this.accordionInstance = null;  // AccordionDetails インスタンスへの参照
    this.closeMenuThreshold = options.closeMenuThreshold || 5; // メニューを閉じるスクロール量閾値(px)
  }

  //----------------------------------------
  //  各種登録
  register() {
    //  ヘッダー
    this.headerbar_elm = document.querySelector("#header");

    //  ヘッダー出現位置に使用するセクション(MV)
//    this.trigger_elm_header = document.querySelector('.js-scroll-event-trigger01');
    this.trigger_elm_mv      = document.querySelector('.js-trigger-mv');
    //  ページトップに戻るボタン
    this.trigger_elm_pageTop = document.querySelector('.js-btn-page-top');

    //  トップか
    this.isTopPage = document.querySelector('.p-home') ? true : false;

  }

  //----------------------------------------
  //  アコーディオンインスタンスを設定
  //  mobile_menu.js と同様の依存性注入パターン
  //  @param {Object} instance - AccordionDetails インスタンス
  setAccordionInstance(instance) {
    this.accordionInstance = instance;
  }

  //----------------------------------------
  //  メガメニュー(ヘッダーアコーディオン)を閉じる
  //  スクロール時にメニューが開いていたらアニメーション付きで閉じる
  closeHeaderAccordions() {
    if (!this.accordionInstance) return;
    // スクロール時はアニメーション付きで閉じる(instant: false)
    this.accordionInstance.closeAllByGroup('header', null, false);
  }


  //------------------------------------
  task() {
    // ページスクロール = 画面上
    this.scroll_top = window.scrollY;
    // +表示高さ = 画面下
    this.scroll_bottom = window.innerHeight + this.scroll_top;

    // スクロール方向を判定
    this.updateScrollDirection();

    //  個別処理
    this.task_headerBar();
    this.task_headerBarMegaMenu();
    this.task_pageTop();

    // スクロール状態を保存して次の比較に利用
    this.updateScrollDirectionKeep();
  }

  //------------------------------------
  //  スクロール方向の更新
  //  前回のスクロール位置と比較して上下どちらにスクロールしたかを判定
  updateScrollDirection() {
    // ページロード直後の初回実行時: 方向判定なし
    if (!this.is_initialized) {
      this.prev_scroll_top = this.scroll_top;
      this.is_initialized = true;
      return;
    }

    if (this.scroll_top > this.prev_scroll_top + this.threshold) {
      // 下スクロール
      this.scroll_direction = 'down';
    } else if (this.scroll_top < this.prev_scroll_top - this.threshold) {
      // 上スクロール
      this.scroll_direction = 'up';
    }
  }
  //  状態の保存
  updateScrollDirectionKeep() {
    // 次回の比較のために現在位置を保存
    this.prev_scroll_top = this.scroll_top;
  }

  //------------------------------------
  //  処理 : ヘッダーバー
  task_headerBar() {
    let elm = this.headerbar_elm;
    if (!elm) return;

    // ヘッダーバーが .is-open を持っていたら処理を中断
    //  モバイルメニュー開閉時に背景を固定化してY0になってしまうため誤動作がおきる
    if (elm.classList.contains('is-open')) return;

    //  スクロール方向に応じたクラスの付与
    //  下スクロール時: is-scroll-down (ヘッダー非表示用)
    //  上スクロール時: is-scroll-up   (ヘッダー表示用)
    if (this.scroll_direction === 'down') {
      elm.classList.add('is-scroll-down');
      elm.classList.remove('is-scroll-up');
    } else if (this.scroll_direction === 'up') {
      elm.classList.add('is-scroll-up');
      elm.classList.remove('is-scroll-down');
    //  どちらでもない場合(読み込み直後など)
    //  バーが出現するようにする
    } else {
    }

    //------------------------------------
    //  elm.offsetHeight; // サイズ変ってしまうので200固定
    let headerBar_elm_h = 100;  // PCとSPで要調整
    let judge_elm_y = 0;
    //  メインビジュアルの位置取得
    let judge_elm = this.trigger_elm_mv;
    //  MVがある( トップページ )ない場合はY0から変化
    if( judge_elm ) {
      judge_elm_y += judge_elm.offsetTop + judge_elm.offsetHeight;  //  判定位置にMVの開始Yと高さを足す
    }

    // 1pxでもスクロールしたか( 処理の条件を満たしたか )
    let isScrolled = (0 < this.scroll_top ? true : false);
    //  ( 画面上+ヘッダー高 )がMVの位置を超えた
    let isMVOverScrolled = (judge_elm_y <= this.scroll_top + headerBar_elm_h );

    //  トップの場合
    if( this.isTopPage ) {
      //  1pxでも移動した
      isScrolled = (0 < this.scroll_top ? true : false);
    }
/*
    //  下層
    else {
      //console.log("下層");
      //  ( 画面上 )がヘッダー高の位置を超えた
      if ( headerBar_elm_h <= this.scroll_top ) {
        elm.classList.remove('is-scroll-header-inside');
      } else {
        elm.classList.add('is-scroll-header-inside'); //  まだヘッダー超えていない
      }
    }
*/
    //  スクロール処理条件を満たした
    if ( isScrolled ) {
      elm.classList.add('is-scroll-active');
      /*
      document.documentElement.style.setProperty('--scroll-translate-y', `calc(${this.scroll_top} * -1)`);
      //  かつ下に移動：隠れる
      if (this.scroll_direction === 'down') {
        document.documentElement.style.setProperty('--header-translate-y', 'calc(var(--header-height) * -1)');
      //  かつ上に移動：現れる
      } else if (this.scroll_direction === 'up') {
        document.documentElement.style.setProperty('--header-translate-y', '0');
      }*/
    }
    else{
      elm.classList.remove('is-scroll-active');
    }
    //  MVを超えた場合
    if ( isMVOverScrolled ) {
      elm.classList.add('is-scroll-mv-over');
    }
    else {
      elm.classList.remove('is-scroll-mv-over');
    }

//    const transformY = getComputedStyle(this.headerbar_elm).transform.match(/matrix.*\((.+)\)/)[1].split(', ')[5];
//    if (this.scroll_top < headerbar_elm_h + parseFloat(transformY)) {
//    }


  }
  //------------------------------------
  //  処理 : ヘッダーバーメガメニュー閉じる
  task_headerBarMegaMenu() {
    // スクロール量の変化を記録(メガメニュー閉じる判定用)
    const scrollDelta = Math.abs(this.scroll_top - this.prev_scroll_top);

    // 閾値内の場合は方向を変更しない(前回の方向を維持)

    // メガメニューを閉じる処理
    // 上下どちらのスクロールでも、閾値以上動いたら閉じる
    if (scrollDelta >= this.closeMenuThreshold) {
      this.closeHeaderAccordions();

      // 💡 方向限定で閉じたい場合は以下のように条件分岐:
      // 下スクロール時のみ閉じる場合:
      // if (this.scroll_direction === 'down') {
      //   this.closeAllAccordions();
      // }
      // 上スクロール時のみ閉じる場合:
      // if (this.scroll_direction === 'up') {
      //   this.closeAllAccordions();
      // }
    }
  }


  //------------------------------------
  //  処理: ページトップボタン
  task_pageTop() {
    let elm = this.trigger_elm_pageTop;
    if (!elm) return;

    //  メインビジュアルの位置取得
    let judge_elm_y = 350;  //  mvない場合のデフォルト
    const judge_elm = this.trigger_elm_mv;
    //  MVがある
    if( judge_elm ) {
      judge_elm_y = judge_elm.offsetTop + judge_elm.offsetHeight;  //  判定位置にMVの開始Yと高さを足す
    }

    //  画面上が基準位置を超えた
    if (judge_elm_y <= this.scroll_top ) {
      elm.classList.add('is-scroll-active');
    }
    else {
      elm.classList.remove('is-scroll-active');
    }
  }


}
