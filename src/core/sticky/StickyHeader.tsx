/**
 * Created by ananya.chandra on 20/09/18.
 */

import StickyObject, {StickyObjectProps, StickyObjectState, StickyType} from "./StickyObject";

export default class StickyHeader<P extends StickyObjectProps, S extends StickyObjectState> extends StickyObject<P, S> {
    constructor(props: P, context?: any) {
        super(props, context);
    }

    protected initStickyParams(): void {
        this.stickyType = StickyType.HEADER;
        this.stickyTypeMultiplier = 1;
        this.initialVisibility = false;
        this.containerPosition = {top: 0};
    }

    protected getNextYd(nextY: number, nextHeight: number): number {
        return nextY;
    }

    protected getCurrentYd(currentY: number, currentHeight: number): number {
        return currentY;
    }

    protected getScrollY(offsetY: number, scrollableHeight: number): number | null {
        return offsetY;
    }
}
