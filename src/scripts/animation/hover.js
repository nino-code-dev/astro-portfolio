//====================================================
//
//  ホバー処理
//
//  カード、カード中のボタン用を汎用クラスに変更
//
//====================================================
export default class Hover {
  constructor() {
    this.hoverObjects = [];
  }

  //  登録
  register() {
    //----------------------------------------
    //  .js-hoverを全て取得して配列化
    let jsElm = document.querySelectorAll('.js-hover');
    this.hoverObjects = Array.from(jsElm).map(btn => {
      const targets = [];

      //  自分自身を監視対象に含める
      targets.push(btn);

      //  内部のc-btn系を自動的にホバー監視対象にする
      //  内部系c-btnは機能させないdivで作成する
      const btnElements = Array.from(btn.querySelectorAll('div[class*="c-btn"]'));
      targets.push(...btnElements);

      return { btn, targets };
    });

    //----------------------------------------
    //  .js-hover直指定以外の汎用的なホバー要素も自動的に監視対象に追加
    //  a, button要素の.c-btn系
    const extraBtnElements = Array.from(
      document.querySelectorAll('a[class*="c-btn"], button[class*="c-btn"]')
    );
    extraBtnElements.forEach(btn => {
      //  自分自身のみを監視対象とする
      this.hoverObjects.push({ btn, targets: [btn] });
    });

    //----------------------------------------
    //  監視対象に対してイベント登録
    this.hoverObjects.forEach(({ btn, targets }) => {
      //  ホバーした
      btn.addEventListener('mouseenter', () => {
        targets.forEach(target => {
          target.classList.remove('is-leave');
          target.classList.add('is-hover');
        });
      });

      //  ホバー抜けた
      btn.addEventListener('mouseleave', () => {
        targets.forEach(target => {
          target.classList.remove('is-hover');
          target.classList.add('is-leave');
        });
      });

      //  フォーカスした（タブキー等でのアクセシビリティ対応）
      btn.addEventListener('focus', () => {
        targets.forEach(target => {
          target.classList.remove('is-leave');
          target.classList.add('is-hover');
        });
      });

      //  フォーカス抜けた
      btn.addEventListener('blur', () => {
        targets.forEach(target => {
          target.classList.remove('is-hover');
          target.classList.add('is-leave');
        });
      });

      //  アニメーション終了時にis-leaveフラグを削除
      //  （初期状態に戻す。これにより、ページ読み込み時のアニメーション発生を防止）
      targets.forEach(target => {
        //  transitionend: CSS transition用
        target.addEventListener('transitionend', (e) => {
          //  バブリングで子要素のtransitionも拾ってしまうので、自身のみ処理
          if (e.target === target && target.classList.contains('is-leave')) {
            target.classList.remove('is-leave');
          }
        });

        //  animationend: CSS animation用
        target.addEventListener('animationend', (e) => {
          if (e.target === target && target.classList.contains('is-leave')) {
            target.classList.remove('is-leave');
          }
        });
      });

    });
  }
}
