import { useDispatch } from 'react-redux';
import { renderHook } from '@testing-library/react';
import { useAppDispatch } from './useAppDispatch';

jest.mock('react-redux', () => ({
    useDispatch: jest.fn(),
}));

describe('useAppDispatch', () => {
    test('returns the dispatch function from react-redux', () => {
        const dispatch = jest.fn();
        (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);

        const { result } = renderHook(() => useAppDispatch());

        expect(result.current).toBe(dispatch);
    });
});
