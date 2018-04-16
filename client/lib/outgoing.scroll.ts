import { createTimedBooleanSwitch } from "./utils";
import { IncomingSocketNames, OutgoingSocketEvent } from "./socket-messages";
import {
    getScrollPosition,
    getScrollPositionForElement
} from "./browser.utils";
import { Observable } from "rxjs/Observable";
import * as ScrollEvent from "./messages/ScrollEvent";
import { filter } from "rxjs/operators/filter";
import { map } from "rxjs/operators/map";
import { withLatestFrom } from "rxjs/operators/withLatestFrom";
import { share } from "rxjs/operators/share";

export function getScrollStream(
    window: Window,
    document: Document,
    socket$
): Observable<OutgoingSocketEvent> {
    /**
     * A stream of booleans than can be used to pause/resume
     * other streams
     */
    const canSync$ = createTimedBooleanSwitch(
        socket$.pipe(filter(([name]) => name === IncomingSocketNames.Scroll))
    );

    return scrollObservable(window, document).pipe(
        withLatestFrom(canSync$),
        filter(([, canSync]) => canSync),
        map((incoming): OutgoingSocketEvent => {
            const scrollEvent: { target: HTMLElement } = incoming[0];
            const { target } = scrollEvent;

            if ((target as any) === document) {
                return ScrollEvent.outgoing(
                    getScrollPosition(window, document),
                    "document",
                    0
                );
            }

            const elems = document.getElementsByTagName(target.tagName);
            const index = Array.prototype.indexOf.call(elems || [], target);

            return ScrollEvent.outgoing(
                getScrollPositionForElement(target),
                target.tagName,
                index
            );
        })
    );
}

export function scrollObservable(
    window,
    document
): Observable<{ target: any }> {
    return Observable.create(obs => {
        document.addEventListener(
            "scroll",
            function(e) {
                obs.next({ target: e.target });
            },
            true
        );
    }).pipe(share());
}
