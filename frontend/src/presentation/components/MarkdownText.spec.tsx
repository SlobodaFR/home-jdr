import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
  it('renders **bold** markdown as a real <strong>, not literal asterisks', () => {
    render(<MarkdownText>{'Formidable, **Saxor** est taille pour l\'aventure.'}</MarkdownText>);

    const strong = screen.getByText('Saxor');
    expect(strong.tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('renders a numbered markdown list as a real ordered list', () => {
    render(<MarkdownText>{'1. Premier point\n2. Deuxieme point'}</MarkdownText>);

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(screen.getByText('Premier point')).toBeInTheDocument();
    expect(screen.getByText('Deuxieme point')).toBeInTheDocument();
  });

  it('renders plain text with no markdown unchanged', () => {
    render(<MarkdownText>Juste du texte normal.</MarkdownText>);

    expect(screen.getByText('Juste du texte normal.')).toBeInTheDocument();
  });
});
