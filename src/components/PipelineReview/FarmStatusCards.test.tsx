import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { FarmAgent, RoomTemperature } from '@/types/pipeline-farm';
import { FarmAgentCard, FarmStatusCards, RoomTemperatureCard } from './FarmStatusCards';

const NOW = new Date('2026-11-06T12:00:00Z');

const room = (patch: Partial<RoomTemperature> = {}): RoomTemperature => ({
  enabled: true,
  loopRunning: true,
  code: 'in_band',
  holding: false,
  summary: 'The room is 22.4 C, inside 16-27 C: new prints can start.',
  celsius: 22.4,
  readingAgeS: 42,
  source: 'idle printers',
  bandMinC: 16,
  bandMaxC: 27,
  hysteresisC: 1,
  since: '2026-11-06T11:00:00Z',
  checkAgeS: 4,
  checkStalled: false,
  heldJobCount: 0,
  heldJobs: [],
  ...patch,
});

const agent = (patch: Partial<FarmAgent> = {}): FarmAgent => ({
  configured: true,
  transport: 'remote',
  agentId: 'farm-pc',
  state: 'online',
  problem: false,
  problems: [],
  silentAlertS: 300,
  lastContactAt: '2026-11-06T11:59:55Z',
  silentForS: 5,
  lastHeartbeatAt: '2026-11-06T11:58:00Z',
  version: '1.2.3',
  busy: false,
  uptimeS: 7800,
  farmOk: true,
  farmProblems: [],
  openCommands: 0,
  switches: {
    farmLiveEnabled: false,
    agentLiveEnabled: true,
    kill: 'off',
    liveViewEnabled: false,
    emptyBedEnabled: false,
    roomTempEnabled: true,
  },
  ...patch,
});

describe('RoomTemperatureCard', () => {
  it('shows the reading, its age, the band and the source for a room in range', () => {
    render(<RoomTemperatureCard room={room()} now={NOW} />);

    expect(screen.getByText('In range')).toBeVisible();
    expect(screen.getByText('22.4 °C')).toBeVisible();
    expect(screen.getByText(/42 s old/)).toBeVisible();
    expect(screen.getByText('16-27 °C')).toBeVisible();
    expect(screen.getByText('idle printers')).toBeVisible();
    expect(screen.queryByTestId('room-temperature-task')).not.toBeInTheDocument();
    expect(screen.queryByTestId('room-temperature-held')).not.toBeInTheDocument();
  });

  it('reads no reading as a hold: no "In range", the task, and the jobs waiting', () => {
    render(
      <RoomTemperatureCard
        now={NOW}
        room={room({
          code: 'missing',
          holding: true,
          celsius: null,
          readingAgeS: null,
          summary: 'There is no room-temperature reading: new prints are held back.',
          task: {
            key: 'room_temp',
            priority: 2,
            title: 'No usable room temperature reading: new prints are held back',
            detail: 'Check the temperature source.',
            since: '2026-11-06T10:00:00Z',
          },
          heldJobCount: 3,
          heldJobs: [
            {
              jobId: '22222222-2222-4222-8222-000000000001',
              jobName: 'Bracket Mount',
              studentName: 'Sam Rivera',
            },
            { jobId: '22222222-2222-4222-8222-000000000002' },
          ],
        })}
      />,
    );

    expect(screen.getByText('No reading: holding new prints')).toBeVisible();
    expect(screen.queryByText('In range')).not.toBeInTheDocument();
    expect(screen.getByText('none')).toBeVisible();
    const task = screen.getByTestId('room-temperature-task');
    expect(within(task).getByText(/No usable room temperature reading/)).toBeVisible();
    expect(within(task).getByText('Soon')).toBeVisible();
    expect(within(task).getByText('Check the temperature source.')).toBeVisible();
    expect(within(task).getByText('Open 2 hours ago')).toBeVisible();
    const held = screen.getByTestId('room-temperature-held');
    expect(held).toHaveTextContent('3 jobs are waiting for a printer');
    expect(within(held).getByRole('link', { name: 'Bracket Mount' })).toHaveAttribute(
      'href',
      expect.stringContaining('22222222-2222-4222-8222-000000000001'),
    );
    expect(within(held).getByText('Untitled job')).toBeVisible();
    expect(within(held).getByText('and 1 more')).toBeVisible();
  });

  it('marks an urgent task and a too-hot room', () => {
    render(
      <RoomTemperatureCard
        now={NOW}
        room={room({
          code: 'too_hot',
          holding: true,
          celsius: 29.5,
          task: {
            key: 'room_temp',
            priority: 1,
            title: 'The shop is too hot',
            detail: 'Check the AC.',
          },
        })}
      />,
    );

    expect(screen.getByText('Too hot: holding new prints')).toBeVisible();
    expect(screen.getByText('Urgent')).toBeVisible();
  });

  it('warns when the watch is no longer being asked, whatever it last said', () => {
    render(<RoomTemperatureCard now={NOW} room={room({ checkStalled: true, checkAgeS: 1500 })} />);

    expect(screen.getByText('Not being checked')).toBeVisible();
    expect(screen.queryByText('In range')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('room-temperature-stalled')).getByText(/25 min/),
    ).toBeVisible();
  });

  it('says the watch is off and shows no reading rows', () => {
    render(
      <RoomTemperatureCard
        now={NOW}
        room={room({ enabled: false, code: null, summary: 'The room-temperature watch is off.' })}
      />,
    );

    expect(screen.getByText('Watch is off')).toBeVisible();
    expect(screen.getByText('The room-temperature watch is off.')).toBeVisible();
    expect(screen.queryByText('Last reading')).not.toBeInTheDocument();
  });
});

describe('FarmAgentCard', () => {
  it('shows a healthy agent with its last contact, heartbeat and switches', () => {
    render(<FarmAgentCard agent={agent()} now={NOW} />);

    expect(screen.getByText('Online')).toBeVisible();
    expect(screen.getByText('farm-pc')).toBeVisible();
    expect(screen.getByText('1.2.3')).toBeVisible();
    expect(screen.getByText('2 h 10 min')).toBeVisible();
    expect(screen.getByText('2 minutes ago')).toBeVisible();
    expect(screen.queryByTestId('farm-agent-problems')).not.toBeInTheDocument();
    const switches = screen.getByTestId('farm-switches');
    expect(
      within(switches).getByText('Pipeline acts on the live farm').nextSibling,
    ).toHaveTextContent('Off');
    expect(within(switches).getByText('Agent’s own live switch').nextSibling).toHaveTextContent(
      'On',
    );
    expect(within(switches).getByText('Agent kill switch').nextSibling).toHaveTextContent(
      'Off (the agent works)',
    );
    expect(within(switches).getByText('Room-temperature watch').nextSibling).toHaveTextContent(
      'On',
    );
  });

  it('shows silence as a problem with how long, and the pipeline’s words', () => {
    render(
      <FarmAgentCard
        now={NOW}
        agent={agent({
          state: 'silent',
          problem: true,
          problems: ['The farm agent has been silent for 6 min (no poll, no heartbeat).'],
          silentForS: 360,
          lastContactAt: '2026-11-06T11:54:00Z',
        })}
      />,
    );

    expect(screen.getByText('Silent for 6 min')).toBeVisible();
    expect(screen.getByTestId('farm-agent-problems')).toHaveTextContent('silent for 6 min');
    expect(screen.getByText(/quiet for 6 min/)).toBeVisible();
  });

  it('shows an agent that never came and leaves out the rows it has no data for', () => {
    render(
      <FarmAgentCard
        now={NOW}
        agent={agent({
          state: 'never_connected',
          problem: true,
          problems: ['The farm agent "farm-pc" has never connected to this pipeline.'],
          lastContactAt: null,
          switches: {
            farmLiveEnabled: false,
            liveViewEnabled: false,
            emptyBedEnabled: false,
            roomTempEnabled: false,
          },
        })}
      />,
    );

    expect(screen.getByText('Never connected')).toBeVisible();
    expect(screen.queryByText('Last contact')).not.toBeInTheDocument();
    expect(screen.getAllByText('not reported yet')).toHaveLength(2);
  });

  it('shows a kill switch that is on, and what the agent says about the farm', () => {
    render(
      <FarmAgentCard
        now={NOW}
        agent={agent({
          problem: true,
          problems: ['The agent’s kill switch is on'],
          farmOk: false,
          farmProblems: ['nexus does not answer'],
          openCommands: 2,
          oldestOpenCommandAgeS: 90,
          switches: { ...agent().switches, kill: 'writes' },
        })}
      />,
    );

    expect(screen.getByText('Online, with problems')).toBeVisible();
    expect(screen.getByText('On: refuses everything that changes the farm')).toBeVisible();
    expect(screen.getByText('Not reachable')).toBeVisible();
    expect(screen.getByText(/nexus does not answer/)).toBeVisible();
    expect(screen.getByText(/oldest 2 min/)).toBeVisible();
  });

  it('says there is no agent when the pipeline talks to the farm directly', () => {
    render(
      <FarmAgentCard
        now={NOW}
        agent={agent({ configured: false, state: 'not_used', agentId: null, lastContactAt: null })}
      />,
    );

    expect(screen.getByText('No farm agent in use')).toBeVisible();
    expect(screen.getByText(/talks to the farm directly/)).toBeVisible();
    expect(screen.queryByText('Last contact')).not.toBeInTheDocument();
  });
});

describe('FarmStatusCards', () => {
  it('shows each card, or the reason it could not be read', () => {
    render(
      <FarmStatusCards
        now={NOW}
        room={{ ok: false, message: 'Not offered yet' }}
        agent={{ ok: true, value: agent() }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Farm status' })).toBeVisible();
    expect(screen.getByText('Room temperature could not be read')).toBeVisible();
    expect(screen.getByText('Not offered yet')).toBeVisible();
    expect(screen.getByTestId('farm-agent')).toBeVisible();
  });
});
