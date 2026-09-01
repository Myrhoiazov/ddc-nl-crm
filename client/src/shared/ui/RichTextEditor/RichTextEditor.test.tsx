import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
    test('renders the toolbar buttons', async () => {
        render(<RichTextEditor value="<p>hello</p>" onChange={() => {}} />);

        expect(screen.getByLabelText('Жирный')).toBeInTheDocument();
        expect(screen.getByLabelText('Курсив')).toBeInTheDocument();
        expect(screen.getByLabelText('Маркированный список')).toBeInTheDocument();
        expect(screen.getByLabelText('Нумерованный список')).toBeInTheDocument();
        expect(screen.getByLabelText('Ссылка')).toBeInTheDocument();
    });

    test('renders the initial content once the editor mounts', async () => {
        render(<RichTextEditor value="<p>hello</p>" onChange={() => {}} />);

        await waitFor(() => {
            expect(screen.getByText('hello')).toBeInTheDocument();
        });
    });

    test('toggles the bold toolbar button active state on click', async () => {
        render(<RichTextEditor value="<p>hello</p>" onChange={() => {}} />);

        await waitFor(() => screen.getByText('hello'));

        const boldButton = screen.getByLabelText('Жирный');
        fireEvent.click(boldButton);

        await waitFor(() => {
            expect(boldButton.className).toMatch(/toolbarBtnActive/);
        });
    });
});
