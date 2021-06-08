import { selectors, types, util } from 'vortex-api';
import { IPoE2CollectionsData } from './types';

import { exportLoadOrder, importLoadOrder } from './loadOrder';
import { ILoadOrder } from '../types';

export async function genCollectionsData(context: types.IExtensionContext,
                                         gameId: string,
                                         includedMods: string[]) {
  const api = context.api;
  try {
    const loadOrder: ILoadOrder = await exportLoadOrder(api.getState(), includedMods);
    const collectionData: IPoE2CollectionsData = {
      loadOrder,
    };
    return Promise.resolve(collectionData);
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function parseCollectionsData(context: types.IExtensionContext,
                                           gameId: string,
                                           collection: IPoE2CollectionsData) {
  const api = context.api;
  const state = api.getState();
  const profileId = selectors.lastActiveProfileForGame(state, gameId);
  const profile = selectors.profileById(state, profileId);
  if (profile?.gameId !== gameId) {
    return Promise.reject(new util.ProcessCanceled('Last active profile is missing'));
  }
  try {
    await importLoadOrder(api, collection);
  } catch (err) {
    return Promise.reject(err);
  }
}
