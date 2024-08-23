#!/usr/bin/env node
import { program } from "commander";
import { unpackExe, xbzToFlash } from "../src/index.js";

(async () => {
	program
		.description('CLI tool for Siemens FW files.');

	program.command('unpack-exe')
		.description('Unpack FFSInit or service/update .exe')
		.argument('<input>', 'path to .exe')
		.argument('[output-dir]', 'output dir')
		.action(async function (input, outputFile) {
			await unpackExe({input, outputFile, ...this.optsWithGlobals()});
		});

	program.command('xbz2bin')
		.description('Convert .xbz/.xbi/.xfs/.xbb/.exci/.exbi files to fullflash.bin')
		.argument('<input>', 'path to .xbz')
		.argument('[output-file]', 'output file')
		.action(async function (input, outputDir) {
			await xbzToFlash({input, outputDir, ...this.optsWithGlobals()});
		});

	program.showHelpAfterError();
	program.parse();
})();
