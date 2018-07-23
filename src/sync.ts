import { ILoadOrder } from './types';

import * as Promise from 'bluebird';
import { app as appIn, remote } from 'electron';
import * as path from 'path';
import { fs, types, util } from 'vortex-api';

const app = remote !== undefined ? remote.app : appIn;

const poe2Path = path.resolve(app.getPath('appData'), '..', 'LocalLow', 'Obsidian Entertainment', 'Pillars of Eternity II');

let watcher: fs.FSWatcher;
let loadOrder: ILoadOrder = util.makeReactive({});

function modConfig(): string {
  return path.join(poe2Path, 'modconfig.json');
}

function updateLoadOrder(): Promise<void> {
  return fs.readFileAsync(modConfig(), { encoding: 'utf-8' })
    .catch(() => '{}')
    .then(jsonData => {
      const data = JSON.parse(jsonData);
      loadOrder = (data.Entries || []).reduce((prev, entry, idx) => {
        prev[entry.FolderName] = {
          pos: idx,
          enabled: entry.Enabled,
        };
        return prev;
      }, {});
    });
}

export function getLoadOrder(): ILoadOrder {
  return loadOrder;
}

export function setLoadOrder(order: ILoadOrder) {
  loadOrder = order;
  fs.readFileAsync(modConfig(), { encoding: 'utf-8' })
    .catch(() => '{}')
    .then(jsonData => {
      const data = JSON.parse(jsonData);
      data.Entries = Object.keys(loadOrder)
        .sort((lhs, rhs) => loadOrder[lhs].pos - loadOrder[rhs].pos)
        .reduce((prev, key) => {
          prev.push({ FolderName: key, Enabled: loadOrder[key].enabled });
          return prev;
        }, []);
      return fs.writeFileAsync(modConfig(), JSON.stringify(data, undefined, 2), { encoding: 'utf-8' });
    });
}

export function startWatch(state: types.IState): Promise<void> {
  const discovery = state.settings.gameMode.discovered['pillarsofeternity2'];
  if (discovery === undefined) {
    // this shouldn't happen because startWatch is only called if the
    // game is activated and it has to be discovered for that
    return Promise.reject(new Error('Pillars of Eternity 2 wasn\'t discovered'));
  }
  watcher = fs.watch(modConfig(), {}, updateLoadOrder);

  return updateLoadOrder();
}

export function stopWatch() {
  if (watcher !== undefined) {
    watcher.close();
    watcher = undefined;
  }
}
