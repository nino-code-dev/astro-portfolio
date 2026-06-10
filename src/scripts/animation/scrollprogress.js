//========================================
//
//  スクロール連動コントローラー
//
//  判定時に終了させず、常に接触位置の割合を計算し続ける
//  スクロール連動アニメーションに使用する
//  負荷が大きい
//
//----------------------------------------
export default class ScrollProgress {
  constructor() {
    this.targets = [];
    this.onScroll = this.onScroll.bind(this);
  }

  //  登録
  register() {
    this.targets = Array.from(document.querySelectorAll(".js-scroll-progress"));
    if (this.targets.length > 0) {
      window.addEventListener('scroll', this.onScroll);
      window.addEventListener('resize', this.onScroll);
      this.onScroll(); // 初回実行
    }
  }

  onScroll() {
    // ウインドウの高さ
    let windowHeight = window.innerHeight;
    // ヘッダーが存在すればヘッダーの高さを引く
    // ※ヘッダーバーが塗りつぶされている場合。透過の場合は不要
    const header = document.getElementById('header');
    const headerHeight = header ? header.offsetHeight : 0;
    windowHeight -= headerHeight; //

    this.targets.forEach(target => {
      const rect = target.getBoundingClientRect();
      //  要素のY位置をヘッダー分ずらす
      let targetTop = rect.top - headerHeight;
//      console.log( `[rect] ${rect.top} [target] ${targetTop} [header] ${headerHeight}` );
      const computedStyle = getComputedStyle(target);
      //  開始yと終了y余白を設定している場合使用する
      let start_y_per = String(computedStyle.getPropertyValue('--_scroll-progress-start-y')).trim();
      let end_y_per = String(computedStyle.getPropertyValue('--_scroll-progress-end-y')).trim();
        // カスタムプロパティが設定されていない場合や、%以外の数値が入っている場合は0%をセット
        if ( isNaN(parseFloat(start_y_per))) {
          start_y_per = 0;
        }
        if (isNaN(parseFloat(end_y_per))) {
          end_y_per = 0;
        }
        start_y_per = parseFloat(start_y_per);
        end_y_per = parseFloat(end_y_per);

      // 要素の左上がブラウザ画面の一番下と接触している時に0%
      // 要素の左下がブラウザ画面の一番上と接触している時に100%
      const scrollProgress = (windowHeight - targetTop) / (windowHeight + rect.height);
      //  縦幅領域調整の影響を受ける
        const spr_now = ((windowHeight - (windowHeight * start_y_per)) - targetTop );
        const spr_max = (((windowHeight+rect.height) - ( (windowHeight+rect.height) * (start_y_per+end_y_per) )) );
        const scrollProgressRange = spr_now / spr_max;
      //  範囲内であればプログレス範囲のフラグを付ける
      if( 0 <= scrollProgress && scrollProgress <= 100 ){
        target.classList.add("is-progress-active"); }
      else{
        target.classList.remove("is-progress-active");
      }
      if( 0 <= scrollProgressRange && scrollProgressRange <= 100 ){
        target.classList.add("is-progress-range-active");
      }else{
        target.classList.remove("is-progress-range-active");
      }
      // 0%から100%の範囲に制限
      const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1) * 100;
      const clampedProgressRange = Math.min(Math.max(scrollProgressRange, 0), 1) * 100;
      // 中心からの相対位置を計算
      // 0%または100%の時に1、50%の時に0になる値
      const centerRelative = Math.abs(((scrollProgress - 0.5) / 0.5));
//      const centerRelativeRange = 1 - Math.abs((clampedProgressRange - 50) / 50);

      // カスタムプロパティにセット
      target.style.setProperty('--_scroll-progress-center-relative', `${centerRelative}` );
//      target.style.setProperty('--_scroll-progress-range-center-relative', centerRelativeRange);

      // カスタムプロパティにセット
      const arg = String(computedStyle.getPropertyValue('--_scroll-progress-arg')).trim();
      target.style.setProperty('--_scroll-progress', `${clampedProgress}%` );
      target.style.setProperty('--_scroll-progress-range', `${clampedProgressRange}%` );
      if( arg ){
        target.style.setProperty('--_scroll-progress-value', Math.floor((clampedProgress / 100) * arg)); //  掛け算した値をセット
        target.style.setProperty('--_scroll-progress-range-value', Math.floor((clampedProgressRange / 100) * arg));
      }
    });
  }
}
