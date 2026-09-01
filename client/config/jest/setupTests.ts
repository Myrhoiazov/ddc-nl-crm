import { TextDecoder, TextEncoder } from 'util';
import '@testing-library/jest-dom';

// jsdom doesn't provide these globals; react-router-dom needs them at import time.
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder as typeof global.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

// jsdom doesn't implement ResizeObserver; @headlessui/react (Menu, Listbox, Popover) needs it.
if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

// jsdom doesn't implement IntersectionObserver; useInfiniteScroll (Page, list pagination) needs it.
// Tests that assert on intersection behavior itself still install their own mock to control it.
if (typeof global.IntersectionObserver === 'undefined') {
    global.IntersectionObserver = class IntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords(): IntersectionObserverEntry[] {
            return [];
        }
        root = null;
        rootMargin = '';
        thresholds = [];
    } as unknown as typeof IntersectionObserver;
}
