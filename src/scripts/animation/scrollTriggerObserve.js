//========================================
//
//  基本アニメーショントリガー
//  Observe
//  ※トリガーとアニメーション分離のため名称変更
//
//----------------------------------------
import { responsive } from '../utils/responsive.js';

export default class ScrollTriggerObserve {
  constructor() {
    this.defaultOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0
    };
    this.targets = [];
    this.options = {};
    this.observers = [];
    this.activeCount = 0;
    //  追加分
    this.useAnimation = true;
  }

  //----------------------------------------
  //  ページ中指定要素の登録
  register() {
    this.configureAnimation({
      disableOnMobile: false,
      useLoadingAnim: true
    });
    //  対象外クラスの除外
    this.exclusion();

    //  ターゲットの登録
    this.registerTargets("[class*='js-anim'], [class*='js-scroll-trigger']", {
      rootMargin: "10% 0px",
      threshold: [0.1, 0.5, 1.0]
    });
    //  初期化
    this.initialize();
  }

  //----------------------------------------
  // ターゲット登録
  registerTargets(selector, options = {}) {
    const newTargets = document.querySelectorAll(selector);
    this.targets = [...this.targets, ...newTargets];  //  現在の配列の最後尾に追加
    this.options = { ...this.defaultOptions, ...options };
    //console.log(`[scrollTriggerObserve] ターゲット登録: ${this.targets.length} 個の要素を登録しました。`);
    //console.log(newTargets);
  }

  //----------------------------------------
  // 対象外の除外
  //  ターゲット登録前にクラスを精査する
  exclusion() {
    //  PC専用要素であればSP時は削除する
    this.handlePcOnlyAnimations();
  }

  //----------------------------------------
  // 初期化
  initialize() {
    if (this.targets.length === 0) {
      return;
    }

    //  アニメーションを使用しない場合は全てのターゲットを表示する
    if (!this.useAnimation) {
      this.showAllTargets();
      return;
    }

    //   デフォルトを10%にする
    const rootMargins = ["-10% 0px -10% 0px"];
    const thresholds = [0, 0.5, 1];

    rootMargins.forEach((rootMargin) => {
      const observerOptions = {
        root: null,
        rootMargin: rootMargin,
        threshold: thresholds
      };
      const observer = this.createObserver(observerOptions);
      this.observers.push(observer);
    });

    //----------------------------------------
    //  グループトリガー処理
    // 全要素からjs-anim-group-triggerというクラスを探す
    const groupTriggers = document.querySelectorAll('.js-anim-group-trigger');
    groupTriggers.forEach(groupTrigger => {
      // 子要素全てから接頭辞js-animを持つ要素を探す
      const childElements = groupTrigger.querySelectorAll("[class*='js-anim'], [class*='js-scroll-trigger']");
      childElements.forEach(child => {
      // is-not-childがなければ、is-childクラスを付与する
      if (!child.classList.contains('is-not-child')) {
        child.classList.add('is-child');
      }
      //console.log(child);
      });
    });

    //----------------------------------------
    //  アニメーション要素を対応するオブサーバーに割り当てる
    this.targets.forEach(target => {
      //  子要素であれば判定を行わない
      if (target.classList.contains('is-child')) {
        return;
      }

      //  モバイルではない場合(PCの場合)
      //  start-y-pc属性があれば取得し優先利用する
      let startY = target.getAttribute('data-start-y');
      if (!this.checkMobile()) {
        const startYpc = target.getAttribute('data-start-y-pc');
        if (startYpc !== null) {
          startY = startYpc;
        }
      }
      let observerIndex = 0; // デフォルトは0%（rootMargin: "0px"）

      if (startY !== null) {
        const startYValue = parseFloat(startY);
        if (!isNaN(startYValue)) {
            observerIndex = rootMargins.findIndex(margin => margin.includes(`${startYValue * -100}%`));
          if (observerIndex === -1) observerIndex = 0; // 見つからない場合はデフォルト
          //console.log(target);
          //console.log(`[observe]${observerIndex} [startYValue]${startYValue}`);
        }
      }
      //  ターゲットのアニメーション状態を更新
      //  オブザーバーにターゲットを登録
      this.observers[observerIndex].observe(target);
    });
  }


  //----------------------------------------
  // 作成
  createObserver(options) {
    return new IntersectionObserver(this.handleObserve.bind(this), options);
  }

  //----------------------------------------
  // PC専用アニメーション要素の処理
  handlePcOnlyAnimations() {
    //  ブラウザ状態を判別
    if (!this.checkMobile()) return;
    //  子要素含めてクラスを取得
    const pcOnlyElements = document.querySelectorAll(".js-anim-group-pc");

    pcOnlyElements.forEach(element => {
      const childElements = element.querySelectorAll("[class*='js-anim'], [class*='js-scroll-trigger']");
      //  子要素から全て削除
      childElements.forEach(child => {
//        console.log(child);
        Array.from(child.classList).forEach(className => {
//          console.log(className);
          if (className.startsWith("js-anim-")) child.classList.remove(className);
          if (className.startsWith("js-scroll-")) child.classList.remove(className);
          if (className.startsWith("is-anim-")) child.classList.remove(className);
        });
      });
      //  自分自身から削除
//      console.log(element);
      // クラスリストを配列としてコピーし、ループ中に安全に削除
      Array.from(element.classList).forEach(className => {
//        console.log(className);
        if (className.startsWith("js-anim-")) element.classList.remove(className);
        if (className.startsWith("js-scroll-")) element.classList.remove(className);
        if (className.startsWith("is-anim-")) element.classList.remove(className);
      });
    });

    //  自身のクラスを取得
    const pcOnlyElement = document.querySelectorAll(".js-anim-pc");
    pcOnlyElement.forEach(element => {
      //  自分自身から削除
      Array.from(element.classList).forEach(className => {
        if (className.startsWith("js-anim-")) element.classList.remove(className);
        if (className.startsWith("js-scroll-")) element.classList.remove(className);
        if (className.startsWith("is-anim-")) element.classList.remove(className);
      });
    });
  }

  //----------------------------------------
  // 全ターゲットを即座に表示
  showAllTargets() {
    this.targets.forEach(target => {
      if (target.classList.contains("js-scroll-trigger")) {
        target.classList.add("is-active");
      } else {
        // js-scroll-で始まるクラスを全て削除
        // 削除されればアニメーション関連は実行されない
        target.classList.forEach(className => {
          if (className.startsWith("js-anim-")) target.classList.remove(className);
          if (className.startsWith("js-scroll-")) target.classList.remove(className);
        });
//        target.setAttribute("data-animated", "end");
//        target.setAttribute("data-noanime", "");
      }
    });
  }

  //----------------------------------------
  // 観察ハンドラ
  handleObserve(entries) {
    //console.log(`${entries.length}`);
    entries.forEach(entry => {
      //  判定を無視、存在すれば実行するフラグ
      const isAutoPlay = entry.target.classList.contains("js-anim--autoplay");
      const isCollision = entry.isIntersecting || isAutoPlay;
      if (isCollision) {
        let isDispatch = false;

        // この要素がグループトリガーの場合
        //  これ以下の要素にjs-animが含まれている場合、全て実行する
        if (entry.target.classList.contains('js-anim-group-trigger')) {
          //  is-childを保有する全ての子要素に対してイベントを発行する
          const childElements = entry.target.querySelectorAll('.is-child');
          childElements.forEach(child => {
            const childEvent = new CustomEvent('scrollTriggerActive', { detail: { target: child } });
            child.dispatchEvent(childEvent);
          });
          entry.target.classList.remove('js-anim-group-trigger');
        } else {
          // この要素がトリガーの場合
          if (entry.target.classList.contains('js-scroll-trigger')) {
            isDispatch = true;
          } else {
            // この要素がjs-animで始まるクラスを1つでも持っていれば
            for (const cls of entry.target.classList) {
              if (cls.startsWith('js-anim')) {
                isDispatch = true;
                break;
              }
            }
          }
        }
        //  メッセージ送信処理
        if( isDispatch ) {
          const event = new CustomEvent('scrollTriggerActive', { detail: { target: entry.target } });
          entry.target.dispatchEvent(event);
        }
        this.observers.forEach(observer => observer.unobserve(entry.target));
        //  要素に実行済みフラグがなければカウント
        //  ※ブラウザの更新連打などでdisconnectしているにも関わらず
        //    複数回実行されているイベントが発生する場合があるため対策
        if( !entry.target.isAnimating ) {
          this.activeCount ++;
        }
        //  アニメーション済みフラグを付与
        entry.target.isAnimating = true;
      }
    });
    //  全てのターゲットがアクティブになった場合、オブザーバーを停止
    if (this.activeCount === this.targets.length) {
      this.observers.forEach(observer => observer.disconnect());
    }
  }



  //----------------------------------------
  // モバイルデバイスチェック
  //----------------------------------------
  checkMobile() {
    return responsive.isMobile();
  }

  //----------------------------------------
  // アニメーション設定関数
  //----------------------------------------
  configureAnimation(config = {}) {
    if (config.disableOnMobile !== undefined) {
      this.useAnimation = !(config.disableOnMobile && this.checkMobile());
    }
    if (config.useLoadingAnim !== undefined) {
      this.useLoadingAnim = config.useLoadingAnim;
    }
  }
}
