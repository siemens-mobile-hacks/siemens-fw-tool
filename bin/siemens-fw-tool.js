#!/usr/bin/env node
import { program } from "commander";
import { unpackExe, xbiToFlash, info } from "../src/index.js";

(async () => {
	program
		.description('CLI tool for Siemens FW files.');

	program.command('info')
		.description('Into about fw files.')
		.argument('<input>', 'path to WinSwup or .exe files')
		.action(async function (input, outputDir) {
			await info({input, ...this.optsWithGlobals()});
		});

	program.command('unpack-exe')
		.description('Unpack FFSInit or service/update .exe')
		.argument('<input>', 'path to .exe')
		.argument('[output-dir]', 'output dir')
		.action(async function (input, outputDir) {
			await unpackExe({input, outputDir, ...this.optsWithGlobals()});
		});

	program.command('fw2bin')
		.description('Convert WinSwup files to fullflash.bin')
		.argument('<input>', 'path to .xbi')
		.argument('[output-file]', 'output file')
		.action(async function (input, outputFile) {
			await xbiToFlash({input, outputFile, ...this.optsWithGlobals()});
		});

	program.showHelpAfterError();
	program.parse();
})();
