//========================================
//
//  トリガー連動アニメーション
//
//  カスタムイベントを取得して開始されるアニメーション
//  カスタムイベントは
//  ・scrollTriggerObserver.js
//  ・scrollTriggerRect.js
//  で発行される
//
//  observerをメインで使用するが、
//  状況によってうまくスクロール判定が行われない事がある。
//  その場合rectを使用する。負荷が大きいが細かくとれる。
//
//  判定成功後のアニメーションの処理は同じな為、
//  判定の処理とアニメーションを分けた。
//
//----------------------------------------
import { responsive } from '../utils/responsive.js';

export default class TriggerAnimation {
  constructor() {
    this.elements = [];
    //  追加分
    this.isMobile = this.checkMobile();
  }

  //  登録
  register() {
    //  登録するクラス名を全て設定
    this.elements = [
      ...document.querySelectorAll('[class*="js-anim"]'),
      ...document.querySelectorAll('[class*="js-scroll-trigger"]')
    ];

    // 重複を削除
    this.elements = this.elements.filter((element, index, self) =>
      index === self.findIndex(e => e === element)
    );

    //  外部で発行されたイベントを受け取り実行
    this.elements.forEach(element => {
      element.addEventListener('scrollTriggerActive', this.handleAnimation.bind(this));
    });
  }

  //----------------------------------------
  // モバイルデバイスチェック
  checkMobile() {
    return responsive.isMobile();
  }

  //----------------------------------------
  //  イベントを実行
  handleAnimation(event) {
    const target = event.target;
    //console.log(target);
    // scrollTriggerObserve.jsのhandelObserve内isPlayが成立した後の内容をここに記述
    //  グループデータがある
    const groupDelay = target.getAttribute("data-group-delay");
    //  グループ
    if (groupDelay) {
      this.animateTargetGroup(target, groupDelay);
    }
    //  単一
    else {
      this.animateTarget(target); //  アニメーション済みフラグを付与
    }
  }

  //----------------------------------------
  // アニメーション開始関数
  animateTarget(target) {
    //  ★ alternative要素（u-sr-only、スクリーンリーダー用）はスキップ
    //  stagger-text系のalternative要素はアニメーション対象外
    if (target.classList.contains('js-stagger-alternative')) {
      return;
    }

    //  この子要素にjs-系のクラス名があった場合に独自イベントを発行する
    //  ・js-anim系であれば実行しない
    const children = target.querySelectorAll('[class*="js-"]');
    children.forEach(child => {
      child.classList.forEach(cls => {
        if (cls.startsWith('js-') && !cls.startsWith('js-anim')) {
          //console.log( cls );
          const event = new CustomEvent('scrollAnimationActive', { detail: { className: cls } });
          child.dispatchEvent(event);
        }
      });
    });

    //  特定のパターンであれば処理を分岐

    //    console.log(`animTarget] ${target.classList}`);
    if (target.classList.contains("js-anim-group-trigger")) {
      target.classList.remove('js-anim-group-trigger');
    }

    //  is-activeを付与して終了
    if (target.classList.contains("js-scroll-trigger")) {
      //  ディレイを取得
      let dataDelay = target.getAttribute("data-delay");
      if (dataDelay) {
        setTimeout(() => {
          target.classList.add("is-active");
        }, parseInt(dataDelay));
      } else {
        target.classList.add("is-active");
      }
      return;
    }

    // 初期の状態を強制的に設定し、次のフレームでアニメーション開始
    //target.setAttribute('data-animated', 'start');  //  適当な値を入れてfalseではなくさせる
    //  アニメーション状態に関わらずis-activeを付与
    //  終了時も残す事で汎用的に扱えるようにする
    //    target.classList.add("is-active");

    //  カスタムプロパティの変更
    this.isMobile = this.checkMobile();
    //  ディレイが指定されていればセット
    let dataDelay = target.getAttribute("data-delay");
    //  モバイル幅の場合はdata-delay-spがあれば上書き使用する
    if (this.isMobile) {
      let spDelay = target.getAttribute("data-delay-sp");
      if (spDelay) {
        dataDelay = spDelay;
      }
      //  PC幅の場合はdata-delay-pcがあれば上書き使用する
    } else {
      let pcDelay = target.getAttribute("data-delay-pc");
      if (pcDelay) {
        dataDelay = pcDelay;
      }
    }
    if (dataDelay) {
      dataDelay += "ms";
    } else {
      dataDelay = "0ms";
    }
    target.style.setProperty('--_delay', dataDelay);
    //    console.log(`  delay: ${dataDelay}`);
    //    console.log(target);

    // data-anim-mode="slide" を持つ場合はアクティブ化せず終了する
    // このモードの要素はSwiperが制御する
    if (target.getAttribute('data-anim-mode') === 'slide') {
      return;
    }

    //  デフォルト値を適用させるため、
    //  1フレームの遅延を挟んでアニメーションをトリガー
    requestAnimationFrame(() => {
      //  ★ stagger-text系の判定
      //  stagger-text系は子要素がアニメーションするため、
      //  transitionendでは検知できない。計算した合計時間でsetTimeoutを使用。
      const isStaggerText = Array.from(target.classList).some(cls =>
        cls.includes('js-anim-stagger-text')
      );

      //  デフォルトのjs-anim-*は is-anim-active をフラグとして統一
      target.classList.add("is-anim-active");

      //  stagger-text系は既存CSSが is-active 前提のため維持
      if (isStaggerText) {
        target.classList.add("is-active");
      }
      if (isStaggerText) {
        // data-total-durationから合計時間を取得
        const totalDuration = parseInt(target.dataset.totalDuration, 10) || 0;

        // 合計時間 + delayを加算してsetTimeoutでis-anim削除
        const animDelay = parseInt(dataDelay) || 0;
        const totalTime = totalDuration + animDelay;

        setTimeout(() => {
          target.style.removeProperty('--_delay');
          target.classList.remove("is-anim-active");
          // js-animが含まれるクラスを削除
//          target.classList.forEach(cls => {
//            if (cls.startsWith('js-anim')) {
//              target.classList.remove(cls);
//            }
//          });
        }, totalTime);
      } else {
        // 通常アニメーション: transitionendで検知
        target.addEventListener('transitionend', (event) => {
          // 対象要素自体のtransitionのみ処理（子要素のバブリングを無視）
          if (event.target !== target) return;
          target.style.removeProperty('--_delay');
          target.classList.remove("is-anim-active");
          // js-animが含まれるクラスを削除
          target.classList.forEach(cls => {
            if (cls.startsWith('js-anim')) {
              target.classList.remove(cls);
            }
          });
        });
      }
    });
  }

  //----------------------------------------
  // アニメーション開始 : 親要素から子要素
  animateTargetGroup(target, i_delay = 100) {
    //  親要素に付与されるアニメーション名を取得
    let parentAnimName = target.getAttribute("data-anim");
    let isAnimData = parentAnimName ? true : false;
    let isAnimClass = false;
    let animClass = null;
    if (!parentAnimName) {
      animClass = Array.from(target.classList).find(cls => cls.startsWith('js-anim'));
      if (animClass) {
        parentAnimName = animClass;
        isAnimClass = true;
      }
    }
    const parentAnimDelay = parseInt(target.getAttribute("data-group-delay"));
    //  親からはアニメーションを削除
    target.removeAttribute('data-anim');
    target.removeAttribute('data-group-delay');
    if (animClass) {
      target.classList.remove(animClass);
    }

    //  全子要素を取得
    // 子要素のHTMLCollectionを配列に変換
    const childrenArray = [...target.children];

    let childcount = 0;
    // forEachを使用して各子要素にクラスを追加
    childrenArray.forEach(child => {
      //      childcount ++;  //  1つめからディレイを加えたい場合
      let childdelay = 0 < childcount ? parentAnimDelay * childcount : 0;  //  親で指定したディレイ x 子の番号
      childcount++;  //  1つめのディレイは0の場合)
      //  親のアニメーションを継承
      if (isAnimData) {
        child.setAttribute('data-anim', parentAnimName);
      } else if (isAnimClass) {
        child.classList.add(parentAnimName);
      }
      //      child.setAttribute( "data-animated", "start");
      //  時間差でアニメーション発動
      setTimeout(function () {
        //  次のフレームで完了させる(1フレームはstart状態のCSSが必要)
        requestAnimationFrame(() => {
          //child.setAttribute('data-animated', 'true');
          //  transitionの終了を検知
          child.addEventListener('transitionend', () => {
            //child.setAttribute('data-animated', 'end');
          });
        });
      }, childdelay);
    });
  }

}
