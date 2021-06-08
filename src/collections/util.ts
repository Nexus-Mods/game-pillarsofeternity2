import { types, util } from 'vortex-api';
import { ILoadOrder, ILoadOrderDisplayItem } from '../types';

import { GAME_ID } from '../statics';

interface ILOStatus {
  enabled: ILoadOrderDisplayItem[];
  disabled: ILoadOrderDisplayItem[];
}

export function isValidMod(mod: types.IMod) {
  return (mod !== undefined)
    && (mod.type !== 'collection');
}

export function isModInCollection(collectionMod: types.IMod, mod: types.IMod) {
  if (collectionMod.rules === undefined) {
    return false;
  }

  return collectionMod.rules.find(rule =>
    util.testModReference(mod, rule.reference)) !== undefined;
}

export function genCollectionLoadOrder(loadOrder: ILoadOrder,
                                       mods: { [modId: string]: types.IMod },
                                       collection?: types.IMod): ILOStatus {
  const validIds = Object.keys(loadOrder).filter(modId => {
    return (collection !== undefined)
      ? isValidMod(mods[modId]) && (isModInCollection(collection, mods[modId]))
      : isValidMod(mods[modId]);
  });

  const mapToItem = (id: string) => ({ id, name: util.renderModName(mods[id]) });

  // validIds.sort((lhs, rhs) => loadOrder[lhs].pos - loadOrder[rhs].pos);
  const loStatus: ILOStatus = validIds.reduce((accum, iter) => {
    if (loadOrder[iter].enabled) {
      accum.enabled.push(mapToItem(iter));
    } else {
      accum.disabled.push(mapToItem(iter));
    }
    return accum;
  }, { enabled: [], disabled: [] });
  return loStatus;
}

export function sanitizeLO(api: types.IExtensionApi, order: ILoadOrder) {
  const state = api.getState();
  const mods: { [modId: string]: types.IMod } =
    util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
  return Object.keys(order).reduce((accum, iter) => {
    if (mods[iter]?.type !== 'collection') {
      accum[iter] = order[iter];
    }
    return accum;
  }, {});
}
