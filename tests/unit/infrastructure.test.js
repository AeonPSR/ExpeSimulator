/**
 * Example Test - Verifies the test infrastructure works
 * 
 * This is a mockup test to confirm:
 * 1. Jest + jsdom environment is working
 * 2. Source files are loaded correctly
 * 3. Window globals are accessible
 */

describe('Test Infrastructure', () => {
  
  test('jsdom provides window global', () => {
    expect(typeof window).toBe('object');
    expect(window).toBeDefined();
  });

  test('Constants module is loaded on window', () => {
    expect(window.Constants).toBeDefined();
    expect(window.Constants.MAX_SECTORS).toBe(20);
    expect(window.Constants.MAX_PLAYERS).toBe(8);
  });

  test('helper functions are available globally', () => {
    expect(typeof getResourceURL).toBe('function');
    expect(typeof formatSectorName).toBe('function');
  });

  test('formatSectorName formats correctly', () => {
    expect(formatSectorName('CRISTAL_FIELD')).toBe('Cristal Field');
    expect(formatSectorName('FOREST')).toBe('Forest');
  });

});
