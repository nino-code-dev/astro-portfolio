//========================================
//
//  スムーススクロール処理
//
//----------------------------------------
export default class smoothScroll {
  constructor() {
    // ヘッダー（ヘッダー高を見ない場合は = 0）
    this.pheader = document.querySelector('#header');
    this.page_nav = document.querySelector('#page-nav');
    this.calculateHeaderHeight();

    // クリックイベントは document に1本だけ張る（ページ側で上書き/割り込みしやすくする）
    this._isRegistered = false;
    this._onClickBound = null;

    // スクロール中断用
    this._scrollSeq = 0;
    this._activeRaf = 0;
    this._cancelOnUserInputBound = this.cancelScroll.bind(this);
  }

  // ヘッダーの高さを再計算する関数
  calculateHeaderHeight() {
    if( !this.pheader ) return null;
    //  ヘッダーバーの高さを取得
    //this.headerHeight = this.pheader ? this.pheader.offsetHeight : 0; // + 20;  //  Y位置調整
    //  up/downがない場合も考慮して初期化
    this.headerHeight = 0;
    // スクロール時にヘッダーが隠れている場合は考慮しない
    if (this.pheader.classList.contains('is-scroll-down')) {
      this.headerHeight = 0;
    } else if (this.pheader.classList.contains('is-scroll-up')) {
      // ヘッダーが表示されている場合は高さを取得
      //  ※フォームバリデーションによる上戻りの場合は含まれない
      this.headerHeight = this.pheader.offsetHeight;
    }
    //  ページナビゲーションがあり、吸着中の場合加算する
    if( this.page_nav && this.page_nav.classList.contains('is-sticky') ){
      this.headerHeight += this.page_nav.offsetHeight;
    }

    this.headerHeight -= 1;  //  Y位置調整( 上のセクションが1px見える事が多い )
    return this.headerHeight;
  }

  // イージング関数（easeOutExpo）
  scrollToPos(position) {
    // 新しいスクロールを開始するたびに、古いアニメーションを無効化する
    const seq = (this._scrollSeq += 1);
    const startPos = window.scrollY;
    const distance = Math.min(
      position - startPos,
      document.documentElement.scrollHeight - window.innerHeight - startPos
    );
    const duration = 800; // スクロールにかかる時間（ミリ秒）

    let startTime;
    function easeOutExpo(t, b, c, d) {
      return (c * (-Math.pow(2, (-10 * t) / d) + 1) * 1024) / 1023 + b;
    }

    const animation = (currentTime) => {
      // 新しいスクロールが始まっていたら中断
      if (seq !== this._scrollSeq) return;

      if (startTime === undefined) {
        startTime = currentTime;
      }
      const timeElapsed = currentTime - startTime;
      const scrollPos = easeOutExpo(timeElapsed, startPos, distance, duration);
      window.scrollTo(0, scrollPos);

      if (timeElapsed < duration) {
        this._activeRaf = requestAnimationFrame(animation);
      } else {
        window.scrollTo(0, position);
        this._activeRaf = 0;
      }
    };

    this._activeRaf = requestAnimationFrame(animation);
  }


  //--------------------------------------------------
  // スクロールアニメーションを中断
  cancelScroll() {
    this._scrollSeq += 1;
    if (this._activeRaf) cancelAnimationFrame(this._activeRaf);
    this._activeRaf = 0;
  }


  //--------------------------------------------------
  // 遅延読み込み解除
  removeLazyLoad() {
    const targets = document.querySelectorAll('[data-src]');
    for (const target of targets) {
      target.setAttribute('src', target.getAttribute('data-src'));
      target.addEventListener('load', () => {
        target.removeAttribute('data-src');
      });
    }
  }


  //--------------------------------------------------
  //  ページ内IDジャンプの登録
  registIDJump() {
    if (this._isRegistered) return;
    this._isRegistered = true;

    // ユーザーが操作している時はスクロールを止める
    ['wheel', 'touchstart', 'mousedown'].forEach((type) => {
      window.addEventListener(type, this._cancelOnUserInputBound, { passive: true });
    });
    window.addEventListener('keydown', this._cancelOnUserInputBound);

    // documentのクリックそのものを処理→ページ内アンカーのスムーススクロール
    this._onClickBound = (e) => {
      // 他の処理がすでに止めているなら何もしない（ページ側の割り込みを優先）
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      //  aがクリックされたか
      const anchor = e.target?.closest?.('a');
      if (!anchor) return;

      // 明示的な除外
      const smoothScrollAttr = anchor.getAttribute('data-smoothscroll');
      if (smoothScrollAttr === 'off') return;
      if (anchor.closest('[data-no-smoothscroll]')) return;
      if (anchor.hasAttribute('download')) return;      //  ダウンロードリンク
      if (anchor.getAttribute('target') === '_blank') return;      //  別タブを開く

      // 同一ページのハッシュだけ対象( 別ページIDジャンプの場合は処理中断 )
      let url;
      try {
        url = new URL(anchor.getAttribute('href') || '', window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== window.location.pathname) return;
      if (url.search !== window.location.search) return;

      // URL.hash が空でも、href が末尾 # の場合があるためフォールバックする
      const hash = (url.hash && url.hash.length) ? url.hash : (url.href.endsWith('#') ? '#' : '');
      if (!hash) return;

      // "#" だけ（1文字）の場合は、飛び先IDが存在しないためトップに移動して中止
      if (hash === '#'){
        e.preventDefault();
        this.cancelScroll();
        this.scrollToPos(1); // iOSのChromeで固定ヘッダーが動くバグがあるため0ではなく1に
        return;
      }

      const id = decodeURIComponent(hash).replace(/^#/, '');
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;

      // フック: スクロール前にUI状態を整えたい場合（タブを開く等）
      // cancelable なので、必要なら listener 側で preventDefault() してこの処理を止められる
      const evt = new CustomEvent('smoothscroll:before', {
        cancelable: true,
        detail: { hash, id, target, anchor }
      });
      if (!document.dispatchEvent(evt)) return;

      e.preventDefault();
      this.cancelScroll();
      this.removeLazyLoad();

      // レイアウト変化（タブ展開等）を待ってから位置計算
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.calculateHeaderHeight();
          const position = target.getBoundingClientRect().top + window.scrollY - this.headerHeight;
          this.scrollToPos(position);

          // ずれ対策 Lazy Load対策(再スクロール処理)
          setTimeout(() => {
            this.calculateHeaderHeight();
            const newPosition = target.getBoundingClientRect().top + window.scrollY - this.headerHeight;
            if (Math.abs(position - newPosition) > 1) {
              this.scrollToPos(newPosition);
            }
          }, 200);
        });
      });
    };

    document.addEventListener('click', this._onClickBound);
  }

  //--------------------------------------------------
  // 別ページ遷移後のスムーススクロール
  registPageJump(){
    const urlHash = window.location.hash;
    if (urlHash) {
      const target = document.getElementById(urlHash.slice(1));
      if (target) {
        this.removeLazyLoad();
        const hh = this.headerHeight;
        // 非同期処理（早い）
        setTimeout(function () {
          const position = target.getBoundingClientRect().top + window.scrollY - hh;
          //scrollToPos(position);  //  アニメーションして位置調整
          window.scrollTo(0, position); //  0秒で位置調整
          // ハッシュを再設定
          history.replaceState(null, '', window.location.pathname); //  ハッシュ付けない
        }, 0);
      }
    }
  }
}