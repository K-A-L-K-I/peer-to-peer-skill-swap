import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app title', () => {
  render(<App />);
  expect(screen.getByText(/Skill Swap Frontend/i)).toBeInTheDocument();
});
