import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { API_BASE } from '../../mocks/handlers';
import Inventory from '../../pages/Inventory';
import useStore from '../../store/useStore';

describe('Integration: Inventory Schedule & Filter Flow', () => {
  const mockInventory = [
    {
      id: 1,
      medicine_name: 'Crocin Pain Relief',
      brand_name: 'Crocin',
      salt_composition: 'Paracetamol 650mg',
      medicine_category: 'Painkiller',
      dosage_form: 'Tablet',
      strength: '650mg',
      total_stock: 120,
      schedule: 'NONE'
    },
    {
      id: 2,
      medicine_name: 'Metformin Hydrochloride',
      brand_name: 'Glycomet',
      salt_composition: 'Metformin 500mg',
      medicine_category: 'Antidiabetic',
      dosage_form: 'Tablet',
      strength: '500mg',
      total_stock: 45,
      schedule: 'G'
    },
    {
      id: 3,
      medicine_name: 'Amoxicillin Trihydrate',
      brand_name: 'Mox',
      salt_composition: 'Amoxicillin 500mg',
      medicine_category: 'Antibiotic',
      dosage_form: 'Capsule',
      strength: '500mg',
      total_stock: 80,
      schedule: 'H'
    },
    {
      id: 4,
      medicine_name: 'Augmentin Duo',
      brand_name: 'Augmentin',
      salt_composition: 'Amoxicillin + Clavulanic Acid',
      medicine_category: 'Antibiotic',
      dosage_form: 'Tablet',
      strength: '625mg',
      total_stock: 25,
      schedule: 'H1'
    },
    {
      id: 5,
      medicine_name: 'Alprazolam Calming',
      brand_name: 'Restyl',
      salt_composition: 'Alprazolam 0.5mg',
      medicine_category: 'Psychotropic',
      dosage_form: 'Tablet',
      strength: '0.5mg',
      total_stock: 10,
      schedule: 'X'
    }
  ];

  beforeEach(() => {
    useStore.setState({
      user: { id: 1, name: 'Admin User', role: 'admin' },
      token: 'admin-token',
    });
    vi.clearAllMocks();

    server.use(
      http.get(`${API_BASE}/inventory`, ({ request }) => {
        const url = new URL(request.url);
        const schedule = url.searchParams.get('schedule');
        const search = url.searchParams.get('search');

        let filtered = [...mockInventory];
        if (schedule && schedule !== 'ALL') {
          filtered = filtered.filter(item => item.schedule === schedule);
        }
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(item =>
            item.medicine_name.toLowerCase().includes(s) ||
            item.brand_name.toLowerCase().includes(s) ||
            item.salt_composition.toLowerCase().includes(s)
          );
        }
        return HttpResponse.json(filtered);
      })
    );
  });

  it('renders all drug schedule badges in the inventory table', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Crocin Pain Relief')).toBeInTheDocument();
    });

    // Verify badges are rendered
    expect(screen.getByText('OTC / None')).toBeInTheDocument();
    expect(screen.getByText('Schedule G')).toBeInTheDocument();
    expect(screen.getByText('Schedule H')).toBeInTheDocument();
    expect(screen.getByText('Schedule H1')).toBeInTheDocument();
    expect(screen.getByText('Schedule X')).toBeInTheDocument();
  });

  it('filters medicines by schedule dropdown', async () => {
    const user = userEvent.setup();
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Crocin Pain Relief')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText(/Filter by Schedule/i);
    await user.selectOptions(filterSelect, 'H1');

    await waitFor(() => {
      expect(screen.getByText('Augmentin Duo')).toBeInTheDocument();
      expect(screen.queryByText('Crocin Pain Relief')).not.toBeInTheDocument();
      expect(screen.queryByText('Alprazolam Calming')).not.toBeInTheDocument();
    });
  });

  it('searches medicines with debounce and clears search', async () => {
    const user = userEvent.setup();
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Crocin Pain Relief')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/Search medicines/i);
    await user.type(searchInput, 'Alprazolam');

    await waitFor(() => {
      expect(screen.getByText('Alprazolam Calming')).toBeInTheDocument();
      expect(screen.queryByText('Crocin Pain Relief')).not.toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText(/Clear search/i);
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Crocin Pain Relief')).toBeInTheDocument();
    });
  });

  it('ensures Inventory is read-only summary with Add Medicine button removed', () => {
    render(<Inventory />);
    expect(screen.queryByRole('button', { name: /Add Medicine/i })).not.toBeInTheDocument();
  });
});
