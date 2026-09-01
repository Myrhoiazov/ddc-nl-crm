import { fireEvent, render, screen } from '@testing-library/react';
import { LangSwitcher } from './LangSwitcher';

describe('LangSwitcher', () => {
    test('renders the full label by default', () => {
        render(<LangSwitcher />);
        expect(screen.getByRole('button', { name: 'language' })).toBeInTheDocument();
    });

    test('renders the short label when short is set', () => {
        render(<LangSwitcher short />);
        expect(screen.getByRole('button', { name: 'lang' })).toBeInTheDocument();
    });

    test('does not throw when clicked', () => {
        render(<LangSwitcher />);
        expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    });
});
