//========================================
//
//  OSとブラウザのチェック
//
//----------------------------------------
export default class osCheck {
  constructor() {
  }

  //  userAgent確認用領域があれば、取得情報を出力
  dispUserAgent(i_output) {
    let div_ua = document.querySelector(i_output);
    let body = document.getElementsByTagName('body')[0];
    if (div_ua) {
      div_ua.innerHTML +=
        '<br>[ua] [' + navigator.userAgent + ']<br>[body] [' + body.className + ']';
    }
  }

  //--------------------------------
  //  bodyタグにclass付与する
  //--------------------------------
  markbody() {
    let body = document.getElementsByTagName('body')[0];
    let ua = window.navigator.userAgent.toLowerCase();
    //  ・PC版windows・macbookのchromeで開発者ツール実行中、SP幅表示時にページ読み込んだ場合
    //    UserAgentを確認するとandroid設定になっている為判別できない。
    //  ・開発者ツールを使っていない状態でページを読み込めばmacintosh・windowsのUAが設定されている。
    //  ・開発者ツールを使用しているユーザーまで対応範囲として見ない
    if (/mac os x/.test(ua)) body.classList.add('is-mac');
    if (/windows nt/.test(ua)) body.classList.add('is-windows');
    //  iphoneのsafariはmacと同じなので実際にはis-macが付く
    //  iphone chromeの場合iphoneと付き判別できるが、正常動作するので不要
    if (/iphone/.test(ua)) body.classList.add('is-iphone');
    if (/android/.test(ua)) body.classList.add('is-android');
    if (/ipad/.test(ua) || (/mac os x/.test(ua) && document.ontouchstart !== undefined))
      body.classList.add('is-ipad');
    //  ブラウザ名を追加
    body.classList.add(this.getBrowser().toLowerCase());
  }


  //--------------------------------
  //  ブラウザ種類の取得
  //--------------------------------
  getBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();
    //console.log( userAgent );
    if (0) {
      return '';
    } else if (userAgent.indexOf('edg') !== -1) {
      return 'Edge';
    } else if (userAgent.indexOf('chrome') !== -1) {
      return 'Chrome';
    } else if (userAgent.indexOf('firefox') !== -1) {
      return 'Firefox';
    } else if (userAgent.indexOf('safari') !== -1) {
      return 'Safari';
    } else if (userAgent.indexOf('msie') !== -1 || userAgent.indexOf('trident') !== -1) {
      //  IEの場合<picture>非対応なのでpicturefill.jsを使用する
      const head = document.head;
      head.insertAdjacentHTML('beforeEnd', '<script src="js/picturefill.min.js" async></script>');
      return 'IE';
    } else {
      return 'Unknown';
    }
  }
}