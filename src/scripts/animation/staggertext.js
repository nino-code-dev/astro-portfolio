//========================================
//
// テキストStaggerアニメーション用クラス
//
// - js-anim-stagger-textクラスを持つ要素を探す
// - テキストを1文字ずつspanで分割
// - 親要素にのみjs-anim-stagger-textを付与(スクロール判定は親1つのみ)
// - アクセシビリティ対応: aria-hidden, translate="no", alternative要素
//
// [使用例1: 単独要素]
// <h1 class="js-anim-stagger-text js-anim-stagger-text--up" data-step-delay="50">
//   タイトル
// </h1>
//
// [使用例2: グループ全体複製（hgroupやdiv対応）]
// <hgroup class="c-heading-en--m js-anim-stagger-text-group">
//   <p class="title-en js-anim-stagger-text--up" lang="en">Group</p>
//   <h2 class="title js-anim-stagger-text--up" data-delay="200" id="sec-group-title">テキスト</h2>
// </hgroup>
//
// [パフォーマンス最適化]
// - スクロール判定は親要素1つのみ(各文字spanには付与しない)
// - 20文字でも1回の判定で済む(従来は20回判定していた)
//
// [アクセシビリティ対策]
// - 分割した文字にaria-hidden="true": スクリーンリーダーが1文字ずつ読まない
// - translate="no": Google翻訳などで誤訳されない
// - alternative要素: 読み上げ・翻訳用に元テキストを保持
//   ※グループの子は不要（元の要素が翻訳対応を全て担当）
// - グループ複製: 正常なセマンティックHTML(元)と演出用(複製)を分離
//
//========================================
export default class StaggerText {
  constructor() {
    // 分割済み要素を保持（将来の拡張用）
    this.targets = [];
  }

  /**
   * 初期化・分割処理
   * 処理順序: js-anim-stagger-text-group → js-anim-stagger-text
   */
  register() {
    // 1. hgroup全体複製処理（単独要素処理より先に実行）
    this._processGroupElements();

    // 2. 単独要素の分割処理
    this._processSingleElements();
  }

  /**
   * グループ全体複製処理
   * js-anim-stagger-text-group を持つ要素を複製
   * （hgroupやdivなど、どのタグでも対応）
   * 
   * 設計理念:
   * - 元の要素: 翻訳対応の全責任を持つ（:lang()制御）
   * - 複製側div: 演出のみ、翻訳対応なし
   * 
   * 処理内容:
   * - 元の要素をu-sr-onlyで視覚非表示、data-group-processedマーク
   * - 演出用のdivを複製して作成（aria-hidden、セマンティック重複回避）
   * - 複製側の子要素にフラグを付与し、alternative作成をスキップ
   */
  _processGroupElements() {
    const groupNodes = document.querySelectorAll('.js-anim-stagger-text-group');

    groupNodes.forEach((groupNode) => {
      // 既に処理済みならスキップ
      if (groupNode.dataset.groupProcessed === 'true') {
        return;
      }

      // === 複製側（演出用）===
      // 先に複製（演出クラス付きの状態で）
      const wrapper = document.createElement('div');
      wrapper.innerHTML = groupNode.outerHTML;
      const clonedGroup = wrapper.firstElementChild;

      // 常にdivに変換（セマンティック重複回避。元がhgroupでもdivでも対応）
      const clonedDiv = document.createElement('div');
      clonedDiv.className = clonedGroup.className;
      clonedDiv.setAttribute('aria-hidden', 'true');

      // 子要素を全て移動
      while (clonedGroup.firstChild) {
        clonedDiv.appendChild(clonedGroup.firstChild);
      }

      // 複製グループの調整
      clonedDiv.classList.remove('js-anim-stagger-text-group');
      clonedDiv.classList.add('js-anim-group-trigger');

      // 子要素に「グループの子」フラグを付与（alternative要素作成スキップ用）
      const clonedChildren = clonedDiv.querySelectorAll('[class*="js-anim-stagger-text"]');
      clonedChildren.forEach(child => {
        child.dataset.isGroupChild = 'true';
      });

      // 子要素のidを削除（重複回避）
      clonedDiv.querySelectorAll('[id]').forEach(child => {
        child.removeAttribute('id');
      });

      // DOMに挿入（元のグループの直後）
      groupNode.parentNode.insertBefore(clonedDiv, groupNode.nextSibling);

      // === 元のグループ（翻訳対応の全責任を持つ）===
      // 子要素から演出クラスのみ削除（タグ・コンテンツ・idは保持）
      const originalChildren = Array.from(groupNode.children);
      originalChildren.forEach(child => {
        const classes = child.className.split(' ').filter(cls => !cls.startsWith('js-anim'));
        child.className = classes.join(' ');
        delete child.dataset.delay;
        delete child.dataset.stepDelay;
      });

      // マーク用クラス追加（CSS側で:lang()制御する際に使用）
      groupNode.classList.add('u-sr-only');
      groupNode.setAttribute('data-group-processed', 'true');
      groupNode.classList.remove('js-anim-stagger-text-group');
      groupNode.classList.remove('js-anim-group-trigger');
    });
  }

  /**
   * 単独要素の分割処理
   * js-anim-stagger-text クラスを持つ要素を1文字ずつspanに分割
   */
  _processSingleElements() {
    const nodes = document.querySelectorAll('[class*="js-anim-stagger-text"]');

    nodes.forEach((node) => {
      // グループ要素自体はスキップ
      if (node.classList.contains('js-anim-stagger-text-group')) {
        return;
      }

      // グループ処理済みの親要素内の子要素はスキップ（元のhgroup内）
      if (node.closest('[data-group-processed="true"]')) {
        return;
      }

      // 既に分割済みならスキップ（2重分割防止）
      if (node.dataset.split === 'true') {
        return;
      }

      // 元のHTML内容を取得（<br>などのタグを保持）
      const originalHTML = node.innerHTML;
      // 元のテキスト内容を取得（アクセシビリティ用alternative要素に使用）
      const originalText = node.textContent;

      // data属性からディレイ設定を取得（未指定時のデフォルト値）
      const stepDelay = parseInt(node.dataset.stepDelay, 10) || 50;
      const startDelay = parseInt(node.dataset.delay, 10) || 0;

      // 文字インデックス（空白を除く）
      let charIndex = 0;

      // 1. HTMLを解析してテキストノードとHTMLタグを分離
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = originalHTML;

      // 2. 再帰的にノードを処理してspan化
      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // テキストノードの場合: 1文字ずつspanでラップ
          // ★HTMLの整形による前後の空白（改行・インデント）を除去
          const text = node.textContent.trim();
          // 空のテキストノードはスキップ
          if (!text) return '';
          const spans = Array.from(text).map(char => {
            if (/\s/.test(char)) {
              // 空白文字はそのまま（アニメーション対象外）
              return `<span aria-hidden="true">&nbsp;</span>`;
            } else {
              // 通常文字: js-stagger-charクラス付与
              const span = document.createElement('span');
              span.className = 'js-stagger-char';
              span.setAttribute('aria-hidden', 'true');
              span.setAttribute('translate', 'no');
              span.style.setProperty('--_index', charIndex);
              span.textContent = char;
              charIndex++;
              return span.outerHTML;
            }
          });
          return spans.join('');
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // 要素ノードの場合: 子ノードを再帰的に処理
          const processedChildren = Array.from(node.childNodes)
            .map(child => processNode(child))
            .join('');

          // 元のタグを保持したまま、子要素を置き換え
          const clonedNode = node.cloneNode(false);
          clonedNode.innerHTML = processedChildren;
          return clonedNode.outerHTML;
        }
        return '';
      };

      // 3. すべての子ノードを処理
      const processedHTML = Array.from(tempDiv.childNodes)
        .map(child => processNode(child))
        .join('');

      // 元のタグ名を保存（H2, H3など）
      const originalTagName = node.tagName.toLowerCase();

      // 演出用span要素を作成
      const displaySpan = document.createElement('span');
      displaySpan.setAttribute('aria-hidden', 'true');
      displaySpan.innerHTML = processedHTML;
      displaySpan.className = node.className;

      // CSS変数を設定（アニメーションディレイ用）
      if (startDelay > 0) {
        displaySpan.style.setProperty('--_start-delay', `${startDelay}ms`);
      }
      if (stepDelay !== 50) {
        displaySpan.style.setProperty('--_step-delay', `${stepDelay}ms`);
      }

      // ★ setTimeout用: 合計アニメーション時間を計算
      // 計算式: totalDuration = startDelay + (charCount - 1) * stepDelay + duration
      // charCount: 空白を除く文字数(charIndex は最後の文字のインデックス)
      const duration = 600; // CSS側の --_duration: 0.6s と合わせる
      const totalDuration = startDelay + (charIndex > 0 ? (charIndex - 1) * stepDelay : 0) + duration;
      displaySpan.dataset.totalDuration = totalDuration;

      // グループの子フラグを引き継ぐ
      const isGroupChild = node.dataset.isGroupChild === 'true';
      if (isGroupChild) {
        displaySpan.dataset.isGroupChild = 'true';
      }

      // Alternative要素（SEO・アクセシビリティ・翻訳対応用）を作成
      // ※グループの子は作成しない（元のhgroupが翻訳対応を全て担当）
      // ※単独要素のみ作成：元テキスト保持のため必須
      let alternativeElement = null;
      if (!isGroupChild) {
        alternativeElement = document.createElement(originalTagName);
        // 元のクラスを引き継ぐ + alternative・u-sr-only追加
        alternativeElement.className = `${node.className} js-stagger-alternative u-sr-only`;
        alternativeElement.textContent = originalText;

        // id属性を引き継ぐ（アンカーリンク対応）
        if (node.id) {
          alternativeElement.id = node.id;
          node.removeAttribute('id');
        }
      }

      // 親要素に挿入
      if (alternativeElement) {
        node.parentNode.insertBefore(alternativeElement, node);
      }
      node.parentNode.insertBefore(displaySpan, node);

      // 元のnodeを削除
      node.remove();

      // 分割済みフラグを付与（2重分割防止）
      displaySpan.dataset.split = 'true';

      // 管理用に保持
      this.targets.push({
        el: displaySpan,
        stepDelay: stepDelay,
        charCount: charIndex
      });
    });
  }
}
