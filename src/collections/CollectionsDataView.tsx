import * as _ from 'lodash';
import * as React from 'react';
import { Button, ListGroup, ListGroupItem } from 'react-bootstrap';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import { getLoadOrder } from '../sync';

import { genCollectionLoadOrder } from './util';

import { ILoadOrder, ILoadOrderDisplayItem, ILoadOrderEntry } from '../types';
import { ComponentEx, EmptyPlaceholder, FlexLayout,
  selectors, types, Usage, util } from 'vortex-api';

const NAMESPACE: string = 'game-pillarsofeternity2';
type LoType = 'enabled' | 'disabled';

interface IExtendedInterfaceProps {
  collection: types.IMod;
}

interface IBaseState {
  enabled: ILoadOrderDisplayItem[];
  disabled: ILoadOrderDisplayItem[];
}

interface IConnectedProps {
  gameId: string;
  mods: { [modId: string]: types.IMod };
  loadOrder: ILoadOrder;
  profile: types.IProfile;
}

type IProps = IExtendedInterfaceProps & IConnectedProps;
type IComponentState = IBaseState;

class CollectionsDataView extends ComponentEx<IProps, IComponentState> {
  public static getDerivedStateFromProps(newProps: IProps, state: IComponentState) {
    const { loadOrder, mods, collection } = newProps;
    const loStatus = genCollectionLoadOrder(loadOrder, mods, collection);
    return (loStatus.enabled !== state.enabled || loStatus.disabled !== state.disabled)
      ? { enabled: loStatus.enabled, disabled: loStatus.disabled } : null;
  }

  constructor(props: IProps) {
    super(props);
    this.initState({
      enabled: [],
      disabled: [],
    });
  }

  public componentDidMount() {
    const { loadOrder, mods, collection } = this.props;
    const loState = genCollectionLoadOrder(loadOrder, mods, collection);
    this.nextState = {
      disabled: loState.disabled,
      enabled: loState.enabled,
    }
  }

  public render(): JSX.Element {
    const { t } = this.props;
    const { enabled, disabled } = this.state;
    return (!!enabled && Object.keys(enabled).length !== 0)
      ? (
        <div style={{ overflow: 'auto' }}>
          <h4>{t('Load Order')}</h4>
          <p>
          {t('Below is a preview of the load order for the mods that ' +
             'are included in the current collection. If you wish to modify the load ' +
             'please do so by opening the Load Order page; any changes made there ' +
             'will be reflected in this collection.')
          }
          </p>
          <FlexLayout id='pillars2-collections-layout' type='row'>
            <FlexLayout.Fixed style={{ width: '100%' }}>
              <h6>{t('Enabled Mods')}</h6>
              <ListGroup id='pillars2-list-group'>
                {enabled.map(en => this.renderModEntry(en, 'enabled'))}
              </ListGroup>
            </FlexLayout.Fixed>
            <FlexLayout.Fixed style={{ width: '100%' }}>
              <h6>{t('Disabled Mods')}</h6>
              <ListGroup id='pillars2-list-group'>
                {disabled.map(dis => this.renderModEntry(dis, 'disabled'))}
              </ListGroup>
            </FlexLayout.Fixed>
          </FlexLayout>
        </div>
    ) : this.renderPlaceholder();
  }

  private openLoadOrderPage = () => {
    this.context.api.events.emit('show-main-page', 'generic-loadorder');
  }
  private renderOpenLOButton = () => {
    const { t } = this.props;
    return (<Button
      id='btn-more-mods'
      className='collection-add-mods-btn'
      onClick={this.openLoadOrderPage}
      bsStyle='ghost'
    >
      {t('Open Load Order Page')}
    </Button>);
  }

  private renderPlaceholder = () => {
    const { t } = this.props;
    return (
      <EmptyPlaceholder
        icon='sort-none'
        text={t('You have no load order entries (for the current mods in the collection)')}
        subtext={this.renderOpenLOButton()}
      />
    );
  }

  private renderModEntry = (loEntry: ILoadOrderDisplayItem, loType: LoType) => {
    const list = loType === 'disabled'
      ? this.state.disabled
      : this.state.enabled;
    const idx = list.findIndex(liItem => liItem.id === loEntry.id);
    const key = `${idx}-${loEntry.id}`;
    const classes = ['pillars2-load-order-entry'];
    return (
      <ListGroupItem
        key={key}
        className={classes.join(' ')}
      >
        <FlexLayout type='row'>
          <p className='load-order-index'>{idx}</p>
          <p>{loEntry.name}</p>
        </FlexLayout>
      </ListGroupItem>
    );
  }
}

const emptyObj = {};
function mapStateToProps(state: types.IState, ownProps: IProps): IConnectedProps {
  const profile = selectors.activeProfile(state) || undefined;
  let loadOrder: ILoadOrder = emptyObj;
  if (!!profile?.gameId) {
    loadOrder = getLoadOrder();
  }

  return {
    gameId: profile?.gameId,
    loadOrder,
    mods: util.getSafe(state, ['persistent', 'mods', profile.gameId], emptyObj),
    profile,
  };
}

function mapDispatchToProps(dispatch: any): any {
  return emptyObj;
}

export default withTranslation(['common', NAMESPACE])(
  connect(mapStateToProps, mapDispatchToProps)(
    CollectionsDataView) as any) as React.ComponentClass<IExtendedInterfaceProps>;
