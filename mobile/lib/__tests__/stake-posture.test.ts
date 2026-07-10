import { resolveStakeUi } from '../stake-posture';

describe('resolveStakeUi', () => {
  it('hidden posture: no SOL UI regardless of deaths or wallet state', () => {
    expect(resolveStakeUi({ posture: 'hidden', totalDeaths: 0, walletConnected: false })).toEqual({
      showSol: false,
      showRitualIntro: false,
    });
    expect(resolveStakeUi({ posture: 'hidden', totalDeaths: 50, walletConnected: true })).toEqual({
      showSol: false,
      showRitualIntro: false,
    });
  });

  it('ritual posture below threshold: behaves like hidden', () => {
    expect(resolveStakeUi({ posture: 'ritual', totalDeaths: 0, walletConnected: false })).toEqual({
      showSol: false,
      showRitualIntro: false,
    });
    expect(resolveStakeUi({ posture: 'ritual', totalDeaths: 2, walletConnected: true })).toEqual({
      showSol: false,
      showRitualIntro: false,
    });
  });

  it('ritual posture at/above threshold: SOL UI + intro line', () => {
    expect(resolveStakeUi({ posture: 'ritual', totalDeaths: 3, walletConnected: false })).toEqual({
      showSol: true,
      showRitualIntro: true,
    });
    expect(resolveStakeUi({ posture: 'ritual', totalDeaths: 10, walletConnected: true })).toEqual({
      showSol: true,
      showRitualIntro: true,
    });
  });

  it('open posture: always shows SOL UI, never the ritual intro', () => {
    expect(resolveStakeUi({ posture: 'open', totalDeaths: 0, walletConnected: false })).toEqual({
      showSol: true,
      showRitualIntro: false,
    });
    expect(resolveStakeUi({ posture: 'open', totalDeaths: 100, walletConnected: true })).toEqual({
      showSol: true,
      showRitualIntro: false,
    });
  });
});
