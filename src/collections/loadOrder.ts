import { actions, selectors, types, util } from 'vortex-api';
import { GAME_ID } from '../statics';
import { getLoadOrder, setLoadOrder } from '../sync';

import { ILoadOrder } from '../types';
import { IPoE2CollectionsData } from './types';
import { sanitizeLO } from './util';

export async function exportLoadOrder(state: types.IState,
                                      modIds: string[]): Promise<ILoadOrder> {
  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);
  if (profileId === undefined) {
    return Promise.reject(new util.ProcessCanceled('Invalid profile id'));
  }

  const loadOrder: ILoadOrder = getLoadOrder();
  if (loadOrder === undefined) {
    return Promise.resolve(undefined);
  }

  const filteredLO: ILoadOrder = Object.keys(loadOrder)
    .reduce((accum, iter) => {
      if (modIds.includes(iter)) {
        accum[iter] = loadOrder[iter];
      }
      return accum;
    }, {})
  return Promise.resolve(filteredLO);
}

export async function importLoadOrder(api: types.IExtensionApi,
                                      collection: IPoE2CollectionsData): Promise<void> {
  const state = api.getState();

  const profileId = selectors.lastActiveProfileForGame(state, GAME_ID);
  if (profileId === undefined) {
    return Promise.reject(new util.ProcessCanceled(`Invalid profile id ${profileId}`));
  }

  const sanitized = sanitizeLO(api, collection.loadOrder);
  setLoadOrder(sanitized);
  return Promise.resolve(undefined);
}
