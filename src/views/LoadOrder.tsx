import { ILoadOrder, ILoadOrderDisplayItem } from '../types';

import DraggableList from './DraggableList';
import LoadOrderEntry from './LoadOrderEntry';

import * as React from 'react';
import { Panel } from 'react-bootstrap';
import { translate } from 'react-i18next';
import { ComponentEx, DNDContainer, FlexLayout, MainPage, types, util } from 'vortex-api';

const PanelX: any = Panel;

export interface ILoadOrderProps {
  mods: { [modId: string]: types.IMod },
  profile: types.IProfile,
  loadOrder: ILoadOrder,
  onSetLoadOrder: (order: ILoadOrder) => void,
}

interface ILoadOrderState {
  enabled: ILoadOrderDisplayItem[];
  disabled: ILoadOrderDisplayItem[];
}

class LoadOrder extends ComponentEx<ILoadOrderProps, ILoadOrderState> {
  private mWriteDebouncer: util.Debouncer;
  constructor(props: ILoadOrderProps) {
    super(props);

    this.initState({
      enabled: [],
      disabled: [],
    });

    this.updateState(props);

    this.mWriteDebouncer = new util.Debouncer(() => {
      const { enabled, disabled } = this.state;
      const newOrder: ILoadOrder = {};
      const numEnabled = enabled.length;
      enabled.forEach((item, idx) => newOrder[item.id] = { pos: idx, enabled: true });
      disabled.forEach((item, idx) => newOrder[item.id] = { pos: numEnabled + idx, enabled: false });

      this.props.onSetLoadOrder(newOrder);
      return null;
    }, 2000);
  }

  public componentWillReceiveProps(newProps: ILoadOrderProps) {
    if ((this.props.loadOrder !== newProps.loadOrder)
        || (this.props.mods !== newProps.mods)
        || (this.props.profile !== newProps.profile)) {
      this.updateState(newProps);
    }
  }

  public render(): JSX.Element {
    const { t } = this.props;
    const { enabled, disabled } = this.state;

    return (
      <MainPage>
        <MainPage.Body>
          <Panel id='pillars2-plugin-panel'>
            <PanelX.Body>
              <DNDContainer style={{ height: '100%' }}>
                <FlexLayout type='row'>
                  <FlexLayout.Flex>
                    <FlexLayout type='column'>
                      <FlexLayout.Fixed>
                        <h4>{t('Enabled')}</h4>
                      </FlexLayout.Fixed>
                      <FlexLayout.Flex>
                        <DraggableList
                          id='enabled'
                          items={enabled}
                          itemRenderer={LoadOrderEntry}
                          apply={this.applyEnabled}
                        />
                      </FlexLayout.Flex>
                    </FlexLayout>
                  </FlexLayout.Flex>
                  <FlexLayout.Flex>
                    <FlexLayout type='column'>
                      <FlexLayout.Fixed>
                        <h4>{t('Disabled')}</h4>
                      </FlexLayout.Fixed>
                      <FlexLayout.Flex>
                        <DraggableList
                          id='disabled'
                          items={disabled}
                          itemRenderer={LoadOrderEntry}
                          apply={this.applyDisabled}
                        />
                      </FlexLayout.Flex>
                    </FlexLayout>
                  </FlexLayout.Flex>
                </FlexLayout>
              </DNDContainer>
            </PanelX.Body>
          </Panel>
        </MainPage.Body>
      </MainPage>
    );
  }

  private updateState(props: ILoadOrderProps) {
    const { mods, loadOrder, profile } = props;

    const sorted = Object.keys(loadOrder || {})
      .filter(lo => (mods[lo] !== undefined) && util.getSafe(profile, ['modState', lo, 'enabled'], false))
      .sort((lhs, rhs) => loadOrder[lhs].pos - loadOrder[rhs].pos);

    const mapToItem = (id: string) => ({ id, name: util.renderModName(mods[id]) });
  
    this.nextState.enabled = sorted
      .filter(id => loadOrder[id].enabled)
      .map(mapToItem);

    this.nextState.disabled = [].concat(
      sorted.filter(id => !loadOrder[id].enabled),
      Object.keys(mods).filter(id => loadOrder[id] === undefined),
    ).map(mapToItem);
  }

  private applyEnabled = (ordered: ILoadOrderDisplayItem[]) => {
    this.nextState.enabled = ordered;
    this.mWriteDebouncer.schedule();
  }

  private applyDisabled = (ordered: ILoadOrderDisplayItem[]) => {
    this.nextState.disabled = ordered;
    this.mWriteDebouncer.schedule();
  }
}

export default translate(['common', 'game-pillarsofeternity2'], { wait: false })(LoadOrder);
