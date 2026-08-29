import { fireEvent, render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
    test('test sidebar', () => {
        render(<Sidebar />);
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
    test('test sidebar with toggle', () => {
        render(<Sidebar />);
        const toggleBtn = screen.getByTestId('sidebar-toggle');
        expect(toggleBtn).toBeInTheDocument();
        fireEvent.click(toggleBtn);
        expect(screen.getByTestId('sidebar')).toHaveClass('collapsed');
        fireEvent.click(toggleBtn);
        expect(screen.getByTestId('sidebar')).not.toHaveClass('collapsed');
    });
});
