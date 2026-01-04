import { render } from '@testing-library/react';

import FedexUi from './ui';

describe('FedexUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FedexUi />);
    expect(baseElement).toBeTruthy();
  });
});
