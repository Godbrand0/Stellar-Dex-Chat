import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '../page';

// Mock dependencies
vi.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(() => false),
}));

vi.mock('@/hooks/useBridgeStats', () => ({
  default: vi.fn(() => ({
    balance: 1000000000000,
    totalDeposited: 5000000000000,
  })),
}));

vi.mock('@/components/AdminGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/AuditTable', () => ({
  default: () => <div data-testid="audit-table">Audit Table</div>,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

global.fetch = vi.fn() as unknown as typeof fetch;

describe('AdminDashboard - Dark Mode Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
  });

  it('renders with theme-aware classes', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Check for theme classes instead of hardcoded colors
    const container = screen.getByText('Admin Dashboard').closest('div');
    expect(container?.className).toContain('theme-');
  });

  it('applies CSS tokens for colors', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // Verify no hardcoded Tailwind color classes
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/bg-blue-\d+/);
    expect(html).not.toMatch(/text-gray-\d+/);
    expect(html).not.toMatch(/border-gray-\d+/);
  });

  it('uses theme utility classes for surfaces', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Bridge Balance')).toBeInTheDocument();
    });

    const card = screen.getByText('Bridge Balance').closest('div');
    expect(card?.className).toContain('theme-surface');
  });

  it('uses theme utility classes for text', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    const heading = screen.getByText('Admin Dashboard');
    expect(heading.className).toContain('theme-text-primary');
  });

  it('handles loading state with theme classes', () => {
    render(<AdminDashboard />);

    const loadingText = screen.getByText('Loading metrics...');
    expect(loadingText.className).toContain('theme-text-muted');
  });
});
