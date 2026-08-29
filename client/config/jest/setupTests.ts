import { TextDecoder, TextEncoder } from 'util';
import '@testing-library/jest-dom';

// jsdom doesn't provide these globals; react-router-dom needs them at import time.
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder as typeof global.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}
