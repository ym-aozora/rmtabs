/*
 * libs/Agent.js
 */

/**
 * Agent
 *
 * @class
 * @classdesc エージェントクラス
 */
export default class Agent {

  /**
   * コンストラクタ
   *
   * @constructor
   * @public
   * @param {Window} window ウィンドウオブジェクト
   * @param {Chrome} chrome Chromeオブジェクト
   */
  constructor(window, chrome) {
    this.window = window;
    this.chrome = chrome;
    this.ports = {};
    this.init();
  }

  /**
   * 初期化処理
   *
   * @private
   */
  init() {
    this.chrome.extension.onMessage.addListener((response, sender) => {
      if ('name' in response && response.name in this) {
        // Call handler
        this[response.name](response);
      } else {
        console.warn('Handler was not found');
      }
    });

    this.portInit('removeTabs');
    this.bindEvents();
  }

  /**
   * ポートオブジェクトの初期化
   *
   * @private
   * @param {string[]} methods メソッド
   */
  portInit(...methods) {
    methods.forEach((method) => {
      const port = this.chrome.extension.connect({name: method});

      port.onDisconnect.addListener(() => {
        delete this.ports[method];
      });

      this.ports[method] = port;
    });
  }

  /**
   * イベントハンドラのセット
   */
  bindEvents() {
    this.window.addEventListener('click', (e) => {
      if (this.ports.removeTabs && e.detail === 3) {
        const document = this.window.document;
        const align = (e.clientX > document.documentElement.clientWidth / 2)
          ? 'right'
          : 'left';

        this.ports.removeTabs.postMessage({
          align,
          clientX: e.clientX,
          clientY: e.clientY,
          pageX: e.pageX,
          pageY: e.pageY,
        });

        this.window.getSelection().collapse(document.body, 0);
      }
    });
  }

  /**
   * 削除後のイベントハンドラ
   *
   * @param {Object} response レスポンス
   */
  onRemovedTabs(response) {
    // TODO: 処理が必要であればここに追記
    // console.log('onRemovedTabs', response);
  }
}
