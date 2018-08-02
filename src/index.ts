import LoadOrder from './views/LoadOrder';

import * as Promise from 'bluebird';
import * as path from 'path';
import { fs, selectors, types, util } from 'vortex-api';
import { getLoadOrder, startWatch, stopWatch, setLoadOrder } from './sync';
import { ILoadOrder } from './types';

let tools = [];

function genAttributeExtractor(api: types.IExtensionApi) {
  return (modInfo: any, modPath: string): Promise<{ [key: string]: any }> => {
    const gameMode = selectors.activeGameId(api.store.getState());
    if ((modPath === undefined) || (gameMode !== 'pillarsofeternity2')) {
      return Promise.resolve({});
    }
    return fs.readFileAsync(path.join(modPath, 'manifest.json'), { encoding: 'utf-8' })
      .catch(() => '{}')
      .then(jsonData => {
        const data = JSON.parse(jsonData);
        const res: { [key: string]: any } = {
          // is this case insensitive?
          minGameVersion: (util as any).getSafeCI(data, ['SupportedGameVersion', 'min'], '1.0'),
          maxGameVersion: (util as any).getSafeCI(data, ['SupportedGameVersion', 'max'], '9.0'),
        };
        return res;
      });
  }
}

function findGame(): Promise<string> {
  return util.steam.findByName('Pillars of Eternity II: Deadfire')
      .then(game => game.gamePath);
}

function modPath(): string {
  return path.join('PillarsOfEternityII_Data', 'override');
}

function prepareForModding(discovery): Promise<void> {
  return fs.ensureDirAsync(path.join(discovery.path, modPath()));
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
      console.log('profile id', util.getSafe(state, ['settings', 'profiles', 'activeProfileId'], undefined));
      console.log('profile', state.persistent.profiles);
      console.log('active profile', selectors.activeProfile(state));
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
