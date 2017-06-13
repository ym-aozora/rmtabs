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
    this.chrome.extension.onConnect.addListener((port) => {
      if ('name' in port && port.name in this) {
        port.onMessage.addListener(this[port.name].bind(this));
      } else {
        console.warn('Handler was not found');
      }
    });

    this.chrome.notifications.onClicked.addListener((notificationId) => {
      switch (notificationId) {
        case 'REMOVE_TABS':
          // this.chrome.notifications.clear(notificationId);
          break;
        default:
          break;
      }
    });

    this.chrome.notifications.onButtonClicked.addListener(
      (notificationId, buttonIndex) => {
        switch (notificationId) {
          case 'REMOVE_TABS':
            if (buttonIndex === 0) {
              this.undoTabs();
            }

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

        tabs.sort((a, b) => {
          if (a.index < b.index) {
            return message.align === 'right' ? -1 : 1;
          } else if (a.index > b.index) {
            return message.align === 'right' ? 1 : -1;
          }

          return 0;
        });

        const removeTabs = _.slice(tabs, _.findIndex(tabs, {
          active: true,
        }) + 1);

        this.chrome.tabs.remove(removeTabs.map((item) => item.id), () => {
          this.histories.push({
            align: message.align,
            removeTabs,
            at: new Date(),
          });

          chrome.notifications.create('REMOVE_TABS', {
            type: 'basic',
            title: 'RmTabs',
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
        });
      })
      .catch(this.onError);
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
      .catch(this.onError);
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
  }

  /**
   * エラーハンドラ
   *
   * @param {Error} e エラー
   */
  onError(e) {
    console.error(e);

    chrome.notifications.create('ON_ERROR', {
      type: 'basic',
      title: 'RmTabs',
      message: chrome.i18n.getMessage('notification_system_error'),
      iconUrl: 'img/icon-512.png',
    });
  }
}
