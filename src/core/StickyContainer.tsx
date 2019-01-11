/**
 * Created by ananya.chandra on 14/09/18.
 */

import * as React from "react";
import * as PropTypes from "prop-types";
import {StyleProp, View, ViewStyle} from "react-native";
import RecyclerListView, {RecyclerListViewState, RecyclerListViewProps} from "./RecyclerListView";
import {ScrollEvent} from "./scrollcomponent/BaseScrollView";
import StickyObject, {StickyObjectProps, StickyObjectState} from "./sticky/StickyObject";
import StickyHeader from "./sticky/StickyHeader";
import StickyFooter from "./sticky/StickyFooter";
import CustomError from "./exceptions/CustomError";
import RecyclerListViewExceptions from "./exceptions/RecyclerListViewExceptions";
import {Layout} from "./layoutmanager/LayoutManager";
import {BaseLayoutProvider, Dimension} from "./dependencies/LayoutProvider";
import DataProvider from "./dependencies/DataProvider";
import {ReactElement} from "react";

export interface StickyContainerProps {
    children: RecyclerChild;
    stickyHeaderIndices?: number[];
    stickyFooterIndices?: number[];
    overrideRowRenderer?: (type: string | number | undefined, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null;
    style?: StyleProp<ViewStyle>;
}
export interface StickyContainerState {
    topVisible: boolean;
}
export interface RecyclerChild extends React.ReactElement<RecyclerListViewProps> {
    ref: (recyclerRef: any) => {};
    props: RecyclerListViewProps;
}
export default class StickyContainer<P extends StickyContainerProps, S extends StickyContainerState> extends React.Component<P, S> {
    public static propTypes = {};
    private _recyclerRef: RecyclerListView<RecyclerListViewProps, RecyclerListViewState> | undefined = undefined;
    private _dataProvider: DataProvider;
    private _layoutProvider: BaseLayoutProvider;
    private _extendedState: object | undefined;
    private _rowRenderer: ((type: string | number, data: any, index: number, extendedState?: object) => JSX.Element | JSX.Element[] | null);

    private _stickyHeaderRef: StickyObject<StickyObjectProps, StickyObjectState> | null = null;
    private _stickyFooterRef: StickyObject<StickyObjectProps, StickyObjectState> | null = null;
    private _visibleIndicesAll: number[] = [];
    private _visibleIndicesNow: number[] = [];
    private _visibleIndicesNotNow: number[] = [];

    constructor(props: P, context?: any) {
        super(props, context);
        this._assertChildType();
        const childProps: RecyclerListViewProps = this.props.children.props;
        this._dataProvider = childProps.dataProvider;
        this._dataProvider = childProps.dataProvider;
        this._layoutProvider = childProps.layoutProvider;
        this._extendedState = childProps.extendedState;
        this._rowRenderer = childProps.rowRenderer;
        this.state = {
            topVisible: false,
        } as S;
    }

    public render(): JSX.Element {
        this._assertChildType();
        const recycler: ReactElement<RecyclerListViewProps> = React.cloneElement(this.props.children, {
            ...this.props.children.props,
            ref: this._getRecyclerRef,
            onVisibleIndicesChanged: this._onVisibleIndicesChanged,
            onScroll: this._onScroll,
        });
        return (
            <View style={this.props.style ? this.props.style : {flex: 1}}>
                {recycler}
                {this.props.stickyHeaderIndices ? (
                    <StickyHeader ref={(stickyHeaderRef: any) => this._getStickyHeaderRef(stickyHeaderRef)}
                                  stickyIndices={this.props.stickyHeaderIndices}
                                  getLayoutForIndex={this._getLayoutForIndex}
                                  getDataForIndex={this._getDataForIndex}
                                  getLayoutTypeForIndex={this._getLayoutTypeForIndex}
                                  getExtendedState={this._getExtendedState}
                                  getRLVRenderedSize={this._getRLVRenderedSize}
                                  getRowRenderer={this._getRowRenderer}
                                  overrideRowRenderer={this.props.overrideRowRenderer}/>
                ) : null}
                {this.props.stickyFooterIndices ? (
                    <StickyFooter ref={(stickyFooterRef: any) => this._getStickyFooterRef(stickyFooterRef)}
                                  stickyIndices={this.props.stickyFooterIndices}
                                  getLayoutForIndex={this._getLayoutForIndex}
                                  getDataForIndex={this._getDataForIndex}
                                  getLayoutTypeForIndex={this._getLayoutTypeForIndex}
                                  getExtendedState={this._getExtendedState}
                                  getRLVRenderedSize={this._getRLVRenderedSize}
                                  getRowRenderer={this._getRowRenderer}
                                  overrideRowRenderer={this.props.overrideRowRenderer}/>
                ) : null}
            </View>
        );
    }

    private _initRecyclerProps = (props: RecyclerListViewProps): void => {
        this._dataProvider = props.dataProvider;
        this._layoutProvider = props.layoutProvider;
        this._extendedState = props.extendedState;
        this._rowRenderer = props.rowRenderer;
    }

    private _getRecyclerRef = (recycler: any) => {
        this._recyclerRef = recycler as (RecyclerListView<RecyclerListViewProps, RecyclerListViewState> | undefined);
        if (this.props.children.ref) {
            if (typeof this.props.children.ref === "function") {
                (this.props.children).ref(recycler);
            } else {
                throw new CustomError(RecyclerListViewExceptions.refNotAsFunctionException);
            }
        }
    }

    private _getStickyHeaderRef = (stickyHeaderRef: any) => {
        if (!this._stickyHeaderRef) {
            this._stickyHeaderRef = stickyHeaderRef as (StickyObject<StickyObjectProps, StickyObjectState> | null);
            // TODO: Resetting state once ref is initialized. Can look for better solution.
            this._callStickyObjectsOnVisibleIndicesChanged(this._visibleIndicesAll, this._visibleIndicesNow, this._visibleIndicesNotNow);
        }
    }

    private _getStickyFooterRef = (stickyFooterRef: any) => {
        if (!this._stickyFooterRef) {
            this._stickyFooterRef = stickyFooterRef as (StickyObject<StickyObjectProps, StickyObjectState> | null);
            // TODO: Resetting state once ref is initialized. Can look for better solution.
            this._callStickyObjectsOnVisibleIndicesChanged(this._visibleIndicesAll, this._visibleIndicesNow, this._visibleIndicesNotNow);
        }
    }

    private _onVisibleIndicesChanged = (all: number[], now: number[], notNow: number[]) => {
        this._visibleIndicesAll = all;
        this._visibleIndicesNow = now;
        this._visibleIndicesNotNow = notNow;
        this._callStickyObjectsOnVisibleIndicesChanged(all, now, notNow);
        if (this.props.children && this.props.children.props && this.props.children.props.onVisibleIndicesChanged) {
            this.props.children.props.onVisibleIndicesChanged(all, now, notNow);
        }
    }

    private _callStickyObjectsOnVisibleIndicesChanged = (all: number[], now: number[], notNow: number[]) => {
        if (this._stickyHeaderRef) {
            this._stickyHeaderRef.onVisibleIndicesChanged(all, now, notNow);
        }
        if (this._stickyFooterRef) {
            this._stickyFooterRef.onVisibleIndicesChanged(all, now, notNow);
        }
    }

    private _onScroll = (rawEvent: ScrollEvent, offsetX: number, offsetY: number) => {
        if (this._stickyHeaderRef) {
            this._stickyHeaderRef.onScroll(offsetY);
        }
        if (this._stickyFooterRef) {
            this._stickyFooterRef.onScroll(offsetY);
        }
        if (this.props.children && this.props.children.props.onScroll) {
            (this.props.children as any).props.onScroll(rawEvent, offsetX, offsetY);
        }
    }

    private _assertChildType = (): void => {
        if (React.Children.count(this.props.children) !== 1 || !this._isChildRecyclerInstance()) {
            throw new CustomError(RecyclerListViewExceptions.wrongStickyChildTypeException);
        }
    }

    private _isChildRecyclerInstance = (): boolean => {
        return (
            this.props.children.props.dataProvider
            && this.props.children.props.rowRenderer
            && this.props.children.props.layoutProvider
        );
    }

    private _getLayoutForIndex = (index: number): Layout | undefined => {
        if (this._recyclerRef) {
            return this._recyclerRef.getLayout(index);
        }
        return undefined;
    }

    private _getDataForIndex = (index: number): any => {
        return this._dataProvider.getDataForIndex(index);
    }

    private _getLayoutTypeForIndex = (index: number): string | number => {
        return this._layoutProvider.getLayoutTypeForIndex(index);
    }

    private _getExtendedState = (): object | undefined => {
        return this._extendedState;
    }

    private _getRowRenderer = (): ((type: string | number, data: any, index: number, extendedState?: object)
        => JSX.Element | JSX.Element[] | null) => {
        return this._rowRenderer;
    }

    private _getRLVRenderedSize = (): Dimension | undefined => {
        if (this._recyclerRef) {
            return this._recyclerRef.getRenderedSize();
        }
        return undefined;
    }
}

StickyContainer.propTypes = {

    // Mandatory to pass a single child of RecyclerListView or any of its children classes. Exception will be thrown otherwise.
    children: PropTypes.element.isRequired,

    // Provide an array of indices whose corresponding items need to be stuck to the top of the recyclerView once the items scroll off the top.
    // Every subsequent sticky index view will push the previous sticky view off the top to take its place.
    // Note: Array indices need to be in ascending sort order.
    stickyHeaderIndices: PropTypes.arrayOf(PropTypes.number),

    // Works same as sticky headers, but for views to be stuck at the bottom of the recyclerView.
    // Note: Array indices need to be in ascending sort order.
    stickyFooterIndices: PropTypes.arrayOf(PropTypes.number),
};
