/*
 * libs/Manager.js
 */

import _ from 'lodash';

/**
 * Manager
 *
 * @class
 * @classdesc 管理クラス
 */
export default class Manager {

  /**
   * コンストラクタ
   *
   * @constructor
   * @public
   * @param {Chrome} chrome Chromeオブジェクト
   */
  constructor(chrome) {
    this.chrome = chrome;
    this.manifest = chrome.runtime.getManifest();
    this.histories = [];
    this.init();
  }

  /**
   * 初期化処理
   */
  init() {
    // 接続された際の処理
    this.chrome.extension.onConnect.addListener((port) => {
      if ('name' in port && port.name in this) {
        port.onMessage.addListener(this[port.name].bind(this));
      } else {
        console.warn('Handler was not found');
      }
    });

    // 通知をクリックされた際の処理
    this.chrome.notifications.onClicked.addListener((notificationId) => {
      switch (notificationId) {
        case 'REMOVE_TABS':
          // 通知をクリックした際の振る舞い
          // this.chrome.notifications.clear(notificationId);
          break;
        default:
          break;
      }
    });

    // 通知のボタンをクリックされた際の処理
    this.chrome.notifications.onButtonClicked.addListener(
      (notificationId, buttonIndex) => {
        switch (notificationId) {
          case 'REMOVE_TABS':
            if (buttonIndex === 0) {
              // 削除通知かつ1番目は「元に戻す」処理
              this.undoTabs();
            }

            // 通知を削除
            this.chrome.notifications.clear(notificationId);
            break;
          default:
            break;
        }
      });
  }

  /**
   * アクティブなウィンドウを取得
   *
   * @return {Promise} アクティブなウィンドウ
   */
  getCurrentWindow() {
    return new Promise((resolve, reject) => {
      this.chrome.windows.getCurrent({
        populate: true,
        windowTypes: ['normal'],
      }, (win) => {
        if (this.chrome.runtime.lastError) {
          reject(this.chrome.runtime.lastError);
        } else {
          resolve(win);
        }
      });
    });
  }

  /**
   * 現在のタブを取得
   *
   * @return {Promise} アクティブなタブ
   */
  getCurrentTab() {
    return new Promise((resolve, reject) => {
      this.getCurrentWindow()
        .then((win) => {
          this.chrome.tabs.query({
            windowId: win.id,
            active: true,
          }, (tabs) => {
            if (this.chrome.runtime.lastError) {
              reject(this.chrome.runtime.lastError);
            } else if (!tabs || tabs.length <= 0) {
              reject(new Error('Current tab is none.'));
            } else {
              resolve(_.head(tabs));
            }
          });
        });
    });
  }

  /**
   * タブを削除
   *
   * @private
   * @param {Object} message 受信メッセージ
   */
  removeTabs(message) {
    this.getCurrentWindow()
      .then((win) => {
        const tabs = _.cloneDeep(win.tabs);

        // ソート
        // 右側 = インデックスの昇順
        // 左側 = インデックスの降順
        tabs.sort((a, b) => {
          if (a.index < b.index) {
            return message.align === 'right' ? -1 : 1;
          } else if (a.index > b.index) {
            return message.align === 'right' ? 1 : -1;
          }

          return 0;
        });

        // 現在のタブより後ろにあるものを削除対象とする
        const activeTabIndex = _.findIndex(tabs, {active: true});
        const activeTab = tabs[activeTabIndex];
        const removeTabs = _.slice(tabs, activeTabIndex + 1);

        // タブを削除
        this.chrome.tabs.remove(removeTabs.map((item) => item.id), () => {
          const history = {
            align: message.align,
            removeTabs,
            removedAt: new Date().toLocaleString(),
          };

          // 履歴を追加
          this.histories.push(history);

          // 通知
          chrome.notifications.create('REMOVE_TABS', {
            type: 'basic',
            title: 'RmTabs',
            // メッセージをテンプレートから生成
            message: _.template(chrome.i18n.getMessage('notification_remove_tabs'))({
              length: removeTabs.length,
              align: chrome.i18n.getMessage(message.align),
            }),
            isClickable: true,
            iconUrl: 'img/icon-512.png',
            buttons: [
              {
                title: chrome.i18n.getMessage('undo'),
              },
            ],
          });

          // 送信元のタブへイベント名・送信メッセージ・履歴を梱包して送信
          this.chrome.tabs.sendMessage(activeTab.id, {
            name: 'onRemovedTabs',
            message,
            history,
          });
        });
      })
      .catch(console.error);
  }

  /**
   * タブを元に戻す
   */
  undoTabs() {
    const latest = _.last(this.histories);

    this.getCurrentTab()
      .then((tab) => {
        _.each(latest.removeTabs, (item, i) => {
          this.chrome.tabs.create({
            url: item.url,
            selected: false,
            index: (latest.align === 'right'
              ? tab.index + 1 + i
              : tab.index
            ),
          });
        });
      })
      .catch(console.error);
  }

  /**
   * 削除履歴を追加
   *
   * @param {Object} history 削除履歴
   */
  addHistory(history) {
    this.histories.push(history);

    // 30件に保つ
    this.histories = _.slice(this.histories, 0, 30);

    // TODO: historiesについて
    // * localStorageに保存する
    // * 件数でなく日付の範囲にするかもしれない(1ヶ月など)
  }
}
