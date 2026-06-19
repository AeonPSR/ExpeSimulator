/**
 * Example Test - Verifies the test infrastructure works
 * 
 * This is a mockup test to confirm:
 * 1. Jest + jsdom environment is working
 * 2. Source files are loaded correctly
 * 3. Window globals are accessible
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

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

// =============================================================================
// Manifest integrity — every script path must point to a real file
// =============================================================================

describe('Manifest integrity', () => {

  test('every path in manifest.json content_scripts exists on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
    const scripts = manifest.content_scripts?.flatMap(cs => cs.js ?? []) ?? [];
    const missing = scripts.filter(p => !fs.existsSync(path.join(ROOT, p)));
    expect(missing).toEqual([]);
  });

  test('every path in tests/setup.js sourceFiles exists on disk', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tests/setup.js'), 'utf8');
    const paths = [...src.matchAll(/'([^']+\.js)'/g)]
      .map(m => m[1])
      .filter(p => p.startsWith('js/') || p === 'config.js');
    const missing = paths.filter(p => !fs.existsSync(path.join(ROOT, p)));
    expect(missing).toEqual([]);
  });

  test('every path in calculation-worker.js importScripts exists on disk', () => {
    const src = fs.readFileSync(path.join(ROOT, 'expeditionSimulator/js/workers/calculation-worker.js'), 'utf8');
    const paths = [...src.matchAll(/baseURL \+ '([^']+)'/g)].map(m => m[1]);
    const missing = paths.filter(p => !fs.existsSync(path.join(ROOT, p)));
    expect(missing).toEqual([]);
  });

  test('every path in calculation-worker.js importScripts is covered by web_accessible_resources', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
    const globs = manifest.web_accessible_resources?.flatMap(r => r.resources ?? []) ?? [];

    // Build a simple glob matcher: only supports trailing * and **/
    function matchesAnyGlob(filePath, globs) {
      return globs.some(glob => {
        if (glob === filePath) return true;
        if (glob.endsWith('*.js')) {
          const prefix = glob.slice(0, -'*.js'.length);
          return filePath.startsWith(prefix) && !filePath.slice(prefix.length).includes('/');
        }
        return false;
      });
    }

    const src = fs.readFileSync(path.join(ROOT, 'expeditionSimulator/js/workers/calculation-worker.js'), 'utf8');
    const paths = [...src.matchAll(/baseURL \+ '([^']+)'/g)].map(m => m[1]);
    const uncovered = paths.filter(p => !matchesAnyGlob(p, globs));
    expect(uncovered).toEqual([]);
  });

});
