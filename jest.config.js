/**
 * Jest Configuration
 * 
 * Uses jsdom environment to provide browser globals (window, document).
 * Source files are loaded in order via setupFilesAfterEnv.
 */
module.exports = {
  testEnvironment: 'jsdom',
  
  // Load source files in manifest order before each test file
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Ignore these directories
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Coverage configuration (optional, for future use)
  collectCoverageFrom: [
    'general/js/**/*.js',
    'expeditionSimulator/js/**/*.js',
    '!expeditionSimulator/js/app.js',
    '!content.js'
  ],
  
  // Custom progress bar reporter (only shows failures verbosely)
  reporters: ['<rootDir>/tests/progress-reporter.js'],
  verbose: false
};
