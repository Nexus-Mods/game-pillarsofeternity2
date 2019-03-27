import { ILoadOrderDisplayItem } from '../types';

import * as React from 'react';
import { ListGroup } from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import * as ReactDOM from 'react-dom';
import { ComponentEx, util } from 'vortex-api';

interface IItemBaseProps {
  index: number;
  item: ILoadOrderDisplayItem;
  itemRenderer: React.ComponentClass<{ className?: string, item: any }>;
  containerId: string;
  take: (item: ILoadOrderDisplayItem, list: ILoadOrderDisplayItem[]) => any;
  onChangeIndex: (oldIndex: number, newIndex: number,
                  changeContainer: boolean, take: (list: ILoadOrderDisplayItem[]) => any) => void;
  apply: () => void;
}

interface IDragProps {
  connectDragSource: __ReactDnd.ConnectDragSource;
  connectDragPreview: __ReactDnd.ConnectDragPreview;
  isDragging: boolean;
}

interface IDropProps {
  connectDropTarget: __ReactDnd.ConnectDropTarget;
  isOver: boolean;
  canDrop: boolean;
}

type IItemProps = IItemBaseProps & IDragProps & IDropProps;

class DraggableItem extends React.Component<IItemProps, {}> {
  public render() {
    const { isDragging, item } = this.props;
    return (
      <this.props.itemRenderer
        className={isDragging ? 'dragging' : undefined}
        item={item}
        ref={this.setRef}
      />
    );
  }

  private setRef = ref => {
    const { connectDragSource, connectDropTarget } = this.props;
    const node: any = ReactDOM.findDOMNode(ref);
    connectDragSource(node);
    connectDropTarget(node);
  }
}

const DND_TYPE = 'poe2-plugin-entry';

function collectDrag(connect: __ReactDnd.DragSourceConnector,
                     monitor: __ReactDnd.DragSourceMonitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

function collectDrop(connect: __ReactDnd.DropTargetConnector,
                     monitor: __ReactDnd.DropTargetMonitor) {
  return {
    connectDropTarget: connect.dropTarget(),
  };
}

const entrySource: __ReactDnd.DragSourceSpec<IItemProps> = {
  beginDrag(props: IItemProps) {
    return {
      index: props.index,
      item: props.item,
      containerId: props.containerId,
      take: (list: ILoadOrderDisplayItem[]) => props.take(props.item, list),
    };
  },
  endDrag(props, monitor: __ReactDnd.DragSourceMonitor) {
    props.apply();
  },
};

const entryTarget: __ReactDnd.DropTargetSpec<IItemProps> = {
  hover(props: IItemProps, monitor: __ReactDnd.DropTargetMonitor, component) {
    const { containerId, index, item, take } = (monitor.getItem() as any);
    const hoverIndex = props.index;

    if (index === hoverIndex) {
      return;
    }

    const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    const clientOffset = monitor.getClientOffset();
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    if (((index < hoverIndex) && (hoverClientY < hoverMiddleY))
        || ((index > hoverIndex) && (hoverClientY > hoverMiddleY))) {
      return;
    }

    props.onChangeIndex(index, hoverIndex, containerId !== props.containerId, take);

    (monitor.getItem() as any).index = hoverIndex;
    if (containerId !== props.containerId) {
      (monitor.getItem() as any).containerId = props.containerId;
      (monitor.getItem() as any).take = (list) => props.take(item, list);
    }
  },
  drop(props) {
    props.apply();
  }
};

const Draggable = DropTarget(DND_TYPE, entryTarget, collectDrop)(
    DragSource(DND_TYPE, entrySource, collectDrag)(
      DraggableItem)) as React.ComponentClass<IItemBaseProps>;

interface IBaseProps {
  id: string;
  items: ILoadOrderDisplayItem[];
  itemRenderer: React.ComponentClass<{ item: ILoadOrderDisplayItem }>;
  apply: (ordered: ILoadOrderDisplayItem[]) => void;
}

interface IState {
  ordered: ILoadOrderDisplayItem[];
}

type IProps = IBaseProps & { connectDropTarget: __ReactDnd.ConnectDropTarget };

class DraggableList extends ComponentEx<IProps, IState> {
  private applyDebouncer: util.Debouncer;
  constructor(props: IProps) {
    super(props);

    this.initState({
      ordered: props.items.slice(0),
    });

    this.applyDebouncer = new util.Debouncer(() => {
      this.apply();
      return null;
    }, 500);

  }

  public componentWillReceiveProps(newProps: IProps) {
    if (this.props.items !== newProps.items) {
      this.nextState.ordered = newProps.items.slice(0);
    }
  }

  public render(): JSX.Element {
    const { connectDropTarget, id, itemRenderer } = this.props;
    const { ordered } = this.state;
    return connectDropTarget(
      <div>
        <ListGroup>
          {ordered.map((item, idx) => (
              <Draggable
                containerId={id}
                key={item.id}
                item={item}
                index={idx}
                itemRenderer={itemRenderer}
                take={this.take}
                onChangeIndex={this.changeIndex}
                apply={this.apply}
              />
            ))}
        </ListGroup>
      </div>);
  }

  public changeIndex = (oldIndex: number, newIndex: number, changeContainer: boolean,
                        take: (list: any[]) => any) => {
    if (oldIndex === undefined) {
      return;
    }

    const copy = this.state.ordered.slice();
    const item = take(changeContainer ? undefined : copy);
    copy.splice(newIndex, 0, item);

    this.nextState.ordered = copy;
  }

  private take = (item: any, list: any[]) => {
    const { ordered } = this.nextState;
    let res = item;
    const index = ordered.findIndex(iter => iter.id === item.id);
    if (index !== -1) {
      if (list !== undefined) {
        res = list.splice(index, 1)[0];
      } else {
        const copy = ordered.slice();
        res = copy.splice(index, 1)[0];
        this.nextState.ordered = copy;
      }
    }
    return res;
  }

  private apply = () => {
    this.props.apply(this.state.ordered);
  }
}

const containerTarget: __ReactDnd.DropTargetSpec<IProps> = {

  hover(props: IProps, monitor: __ReactDnd.DropTargetMonitor, component) {
    const { containerId, index, item, take } = (monitor.getItem() as any);

    if (containerId !== props.id) {
      (component as any).changeIndex(index, 0, true, take);

      (monitor.getItem() as any).index = 0;
      (monitor.getItem() as any).containerId = props.id;
      (monitor.getItem() as any).take = (list) => (component as any).take(item, list);
    }
  },
};

function containerCollect(connect: __ReactDnd.DropTargetConnector,
                          monitor: __ReactDnd.DropTargetMonitor) {
  return {
    connectDropTarget: connect.dropTarget(),
  };
}

export default DropTarget(DND_TYPE, containerTarget, containerCollect)(
  DraggableList) as React.ComponentClass<IBaseProps>;
