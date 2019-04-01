import LoadOrder from './views/LoadOrder';

import { getLoadOrder, setLoadOrder, startWatch, stopWatch } from './sync';
import { ILoadOrder } from './types';

import * as Promise from 'bluebird';
import { app as appIn, remote } from 'electron';
import * as path from 'path';
import { fs, log, selectors, types, util } from 'vortex-api';

const app = remote !== undefined ? remote.app : appIn;
const poe2LocalLowPath = path.resolve(app.getPath('appData'),
  '..', 'LocalLow', 'Obsidian Entertainment', 'Pillars of Eternity II');

const tools = [];

function genAttributeExtractor(api: types.IExtensionApi) {
  // tslint:disable-next-line:no-shadowed-variable
  return (modInfo: any, modPath: string): Promise<{ [key: string]: any }> => {
    const gameMode = selectors.activeGameId(api.store.getState());
    if ((modPath === undefined) || (gameMode !== 'pillarsofeternity2')) {
      return Promise.resolve({});
    }
    return fs.readFileAsync(path.join(modPath, 'manifest.json'), { encoding: 'utf-8' })
      .catch(() => '{}')
      .then(jsonData => {
        try {
          const data = JSON.parse((util as any).deBOM(jsonData));
          const res: { [key: string]: any } = {
            // is this case insensitive?
            minGameVersion: (util as any).getSafeCI(data, ['SupportedGameVersion', 'min'], '1.0'),
            maxGameVersion: (util as any).getSafeCI(data, ['SupportedGameVersion', 'max'], '9.0'),
          };
          return res;
        } catch (err) {
          log('warn', 'Invalid manifest.json', { modPath });
          return {};
        }
      });
  };
}

function findGame(): Promise<string> {
  return util.steam.findByName('Pillars of Eternity II: Deadfire')
      .then(game => game.gamePath);
}

function modPath(): string {
  return path.join('PillarsOfEternityII_Data', 'override');
}

function modConfig(): string {
  return path.join(poe2LocalLowPath, 'modconfig.json');
}

function prepareForModding(discovery): Promise<void> {
  return createModConfigFile().then(
    () => fs.ensureDirAsync(path.join(discovery.path, modPath())));
}

function createModConfigFile(): Promise<void> {
  return fs.statAsync(modConfig())
    .then(st => Promise.resolve())
    .catch(err => {
      if ((err as any).code === 'ENOENT') {
        return writeModConfigFile();
      } else {
        return Promise.reject(err);
      }
    });
}

function writeModConfigFile(): Promise<void> {
  const data = {
    Entries: [],
  };
  return fs.ensureFileAsync(modConfig())
    .then(() => fs.writeFileAsync(modConfig(),
      JSON.stringify(data, undefined, 2), { encoding: 'utf-8' }));
}

const emptyObj = {};

function init(context: types.IExtensionContext) {
  (context as any).registerGame({
    id: 'pillarsofeternity2',
    name: 'Pillars Of Eternity II: Deadfire',
    mergeMods: false,
    queryPath: findGame,
    queryModPath: modPath,
    logo: 'gameart.png',
    executable: () => 'PillarsOfEternityII.exe',
    requiredFiles: [
      'PillarsOfEternityII.exe',
    ],
    supportedTools: tools,
    setup: prepareForModding,
    details: {
      steamAppId: 560130,
    },
  });

  context.registerMainPage('sort-none', 'Load Order', LoadOrder, {
    id: 'pillars2-loadorder',
    hotkey: 'E',
    group: 'per-game',
    visible: () => selectors.activeGameId(context.api.store.getState()) === 'pillarsofeternity2',
    props: () => {
      const state: types.IState = context.api.store.getState();
      return {
        mods: state.persistent.mods['pillarsofeternity2'] || emptyObj,
        profile: selectors.activeProfile(state),
        loadOrder: getLoadOrder(),
        onSetLoadOrder: (order: ILoadOrder) => {
          setLoadOrder(order);
        },
      };
    },
  });

  context.registerAttributeExtractor(100, genAttributeExtractor(context.api));

  context.once(() => {
    context.api.events.on('gamemode-activated', (gameMode: string) => {
      if (gameMode === 'pillarsofeternity2') {
        startWatch(context.api.store.getState())
          .catch(util.DataInvalid, err => {
            const errorMessage = 'Your mod configuration file is invalid, you must remove/fix '
                               + 'this file for the mods to function correctly. The file is '
                               + 'located in: '
                               // tslint:disable-next-line:max-line-length
                               + '"C:\\Users\\{YOUR_USERNAME}\\AppData\\LocalLow\\Obsidian Entertainment\\Pillars of Eternity II\\modconfig.json"';
            context.api.showErrorNotification('Invalid modconfig.json file',
            errorMessage, { allowReport: false });
          })
          .catch(err => {
            context.api.showErrorNotification('Failed to update modorder', err);
          });
      } else {
        stopWatch();
      }
    });

    context.api.setStylesheet('game-pillarsofeternity2',
                              path.join(__dirname, 'stylesheet.scss'));
  });

  return true;
}

export default init;
