/**
 * Custom Jest Reporter - Progress Bar Style
 * 
 * Shows a progress bar with block characters (█) for passing tests.
 * Only lists test names when they fail.
 */

class ProgressReporter {
	constructor(globalConfig, reporterOptions, reporterContext) {
		this._globalConfig = globalConfig;
		this._options = reporterOptions;
		this._context = reporterContext;
		this._passCount = 0;
		this._failCount = 0;
		this._failedTests = [];
	}

	onRunStart(results, options) {
		console.log('\n');
	}

	onTestResult(test, testResult, aggregatedResult) {
		const { testResults } = testResult;
		
		for (const result of testResults) {
			if (result.status === 'passed') {
				this._passCount++;
				process.stdout.write('\x1b[32m█\x1b[0m'); // Green block
			} else if (result.status === 'failed') {
				this._failCount++;
				process.stdout.write('\x1b[31m█\x1b[0m'); // Red block
				this._failedTests.push({
					testPath: testResult.testFilePath,
					title: result.fullName || result.title,
					failureMessages: result.failureMessages
				});
			}
		}
	}

	onRunComplete(testContexts, results) {
		console.log('\n');
		
		// Show failed tests details
		if (this._failedTests.length > 0) {
			console.log('\n\x1b[31m✗ FAILED TESTS:\x1b[0m\n');
			for (const failed of this._failedTests) {
				console.log(`  \x1b[31m✗\x1b[0m ${failed.title}`);
				if (failed.failureMessages && failed.failureMessages.length > 0) {
					for (const msg of failed.failureMessages) {
						console.log(`    ${msg.split('\n').slice(0, 5).join('\n    ')}`);
					}
				}
				console.log('');
			}
		}

		// Summary line
		const totalTests = this._passCount + this._failCount;
		const passColor = this._passCount > 0 ? '\x1b[32m' : '';
		const failColor = this._failCount > 0 ? '\x1b[31m' : '';
		const reset = '\x1b[0m';
		
		console.log(`\nTests: ${failColor}${this._failCount} failed${reset}, ${passColor}${this._passCount} passed${reset}, ${totalTests} total`);
		console.log(`Suites: ${results.numFailedTestSuites} failed, ${results.numPassedTestSuites} passed, ${results.numTotalTestSuites} total`);
		console.log(`Time: ${((results.testResults.reduce((acc, r) => acc + (r.perfStats?.runtime || 0), 0)) / 1000).toFixed(2)}s\n`);
	}
}

module.exports = ProgressReporter;
