import { STARTING_STAMINA } from '../GameContext';
import { DEFAULT_GAME_SETTINGS } from '../instant';

describe('stamina defaults', () => {
  it('starting stamina matches the settings pool (canon: 4)', () => {
    expect(STARTING_STAMINA).toBe(4);
    expect(STARTING_STAMINA).toBe(DEFAULT_GAME_SETTINGS.staminaPool);
  });
});
