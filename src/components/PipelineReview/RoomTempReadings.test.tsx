import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/api/client/errors';
import { pipelineFarmApi } from '@/api/client/pipeline-farm';
import type { ManualTempReading } from '@/types/pipeline-farm';
import { RoomTempReadings } from './RoomTempReadings';

vi.mock('@/api/client/pipeline-farm', () => ({
  pipelineFarmApi: {
    roomTemperatureReadings: vi.fn(),
    enterRoomTemperature: vi.fn(),
    withdrawRoomTemperature: vi.fn(),
  },
}));

const api = vi.mocked(pipelineFarmApi);
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const NOW = new Date('2026-11-06T12:00:00Z');

const reading = (patch: Partial<ManualTempReading> = {}): ManualTempReading => ({
  id: 7,
  celsius: 23.5,
  takenAt: '2026-11-06T11:55:00Z',
  enteredAt: '2026-11-06T11:55:10Z',
  enteredBy: 'Sam Staff',
  note: null,
  withdrawnAt: null,
  withdrawnBy: null,
  inUse: true,
  ...patch,
});

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.roomTemperatureReadings.mockResolvedValue([]);
  api.enterRoomTemperature.mockResolvedValue(reading());
  api.withdrawRoomTemperature.mockResolvedValue({ ok: true, message: 'withdrawn' });
});

describe('RoomTempReadings', () => {
  it('says so when no reading has been entered', async () => {
    render(<RoomTempReadings now={NOW} />);

    expect(await screen.findByText('No thermometer reading has been entered.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save reading' })).toBeEnabled();
  });

  it('lists the recent readings with who entered each, which is in use, and which was withdrawn', async () => {
    api.roomTemperatureReadings.mockResolvedValue([
      reading({ id: 9, celsius: 24, note: 'by the door' }),
      reading({
        id: 8,
        celsius: 29,
        inUse: false,
        withdrawnAt: '2026-11-06T11:40:00Z',
        withdrawnBy: 'Pat Staff',
        enteredBy: 'Sam Staff',
      }),
      reading({ id: 6, celsius: 21, inUse: false, enteredBy: 'Cam Crew' }),
    ]);
    render(<RoomTempReadings now={NOW} />);

    const rows = await screen.findAllByTestId('room-temperature-reading');
    expect(rows.map((row) => row.dataset.state)).toEqual(['in use', 'withdrawn', 'earlier']);
    expect(within(rows[0]).getByText('24.0 °C')).toBeVisible();
    expect(within(rows[0]).getByText(/entered by Sam Staff/)).toBeVisible();
    expect(within(rows[0]).getByText('by the door')).toBeVisible();
    expect(within(rows[0]).getByText('In use')).toBeVisible();
    expect(within(rows[1]).getByText('Withdrawn')).toBeVisible();
    expect(within(rows[1]).getByText(/Withdrawn .* by Pat Staff/)).toBeVisible();
    expect(within(rows[1]).queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument();
    expect(within(rows[2]).getByText(/entered by Cam Crew/)).toBeVisible();
    expect(within(rows[2]).getByRole('button', { name: 'Withdraw the 21.0 °C reading' })).toBeVisible();
  });

  it('sends a typed reading with its note, confirms it, and reloads the list', async () => {
    const user = setup();
    const changed = vi.fn();
    api.roomTemperatureReadings
      .mockResolvedValueOnce([])
      .mockResolvedValue([reading({ celsius: 23.5, note: 'by the door' })]);
    render(<RoomTempReadings now={NOW} onChanged={changed} />);
    await screen.findByText('No thermometer reading has been entered.');

    await user.type(screen.getByLabelText('Thermometer shows (°C)'), '23,5');
    await user.type(screen.getByLabelText('Where you read it (optional)'), ' by the door ');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));

    await waitFor(() =>
      expect(api.enterRoomTemperature).toHaveBeenCalledWith({ celsius: 23.5, note: 'by the door' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Saved 23.5 °C');
    expect(await screen.findByTestId('room-temperature-reading')).toBeVisible();
    expect(screen.getByLabelText('Thermometer shows (°C)')).toHaveValue('');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('asks for a number first and sends nothing when there is none', async () => {
    const user = setup();
    render(<RoomTempReadings now={NOW} />);
    await screen.findByText('No thermometer reading has been entered.');

    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Type what the thermometer shows');

    await user.type(screen.getByLabelText('Thermometer shows (°C)'), 'warm');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('must be a number');
    expect(api.enterRoomTemperature).not.toHaveBeenCalled();
  });

  it('shows the pipeline’s reason when it refuses the number, and keeps what was typed', async () => {
    const user = setup();
    api.enterRoomTemperature.mockRejectedValue(
      new ApiError('INVALID_STAFF_DECISION', '90 C is outside -10 to 50 C, so it looks like a typing mistake'),
    );
    render(<RoomTempReadings now={NOW} />);
    await screen.findByText('No thermometer reading has been entered.');

    await user.type(screen.getByLabelText('Thermometer shows (°C)'), '90');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));

    expect(await screen.findByText(/looks like a typing mistake/)).toBeVisible();
    expect(screen.getByLabelText('Thermometer shows (°C)')).toHaveValue('90');
  });

  it('withdraws a wrong reading and reloads', async () => {
    const user = setup();
    const changed = vi.fn();
    api.roomTemperatureReadings
      .mockResolvedValueOnce([reading({ id: 7, celsius: 29 })])
      .mockResolvedValue([
        reading({ id: 7, celsius: 29, inUse: false, withdrawnAt: '2026-11-06T11:59:00Z', withdrawnBy: 'Sam Staff' }),
      ]);
    render(<RoomTempReadings now={NOW} onChanged={changed} />);

    await user.click(await screen.findByRole('button', { name: 'Withdraw the 29.0 °C reading' }));

    await waitFor(() => expect(api.withdrawRoomTemperature).toHaveBeenCalledWith(7));
    expect(await screen.findByRole('status')).toHaveTextContent('The 29.0 °C reading was withdrawn.');
    expect((await screen.findByTestId('room-temperature-reading')).dataset.state).toBe('withdrawn');
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('shows a failed withdrawal and a list that cannot be read', async () => {
    const user = setup();
    api.roomTemperatureReadings.mockResolvedValue([reading()]);
    api.withdrawRoomTemperature.mockRejectedValue(
      new ApiError('CONFLICT', 'There is no such reading, or it was withdrawn already'),
    );
    const { unmount } = render(<RoomTempReadings now={NOW} />);

    await user.click(await screen.findByRole('button', { name: /Withdraw the/ }));
    expect(await screen.findByText(/withdrawn already/)).toBeVisible();
    unmount();

    api.roomTemperatureReadings.mockRejectedValue(new ApiError('PIPELINE_UNAVAILABLE', 'Not offered yet'));
    render(<RoomTempReadings now={NOW} />);
    expect(await screen.findByText('Not offered yet')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save reading' })).toBeVisible(); // the form still works
  });

  it('reloads the list when the desk reloads', async () => {
    const { rerender } = render(<RoomTempReadings now={NOW} refreshKey={1} />);
    await waitFor(() => expect(api.roomTemperatureReadings).toHaveBeenCalledTimes(1));

    rerender(<RoomTempReadings now={NOW} refreshKey={2} />);

    await waitFor(() => expect(api.roomTemperatureReadings).toHaveBeenCalledTimes(2));
  });
});
