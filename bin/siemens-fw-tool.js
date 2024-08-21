#!/usr/bin/env node
import { program } from "commander";
import { unpackExe, xbzToFlash } from "../src/index.js";

(async () => {
	program
		.description('CLI tool for Siemens FW files.');

	program.command('unpack-exe')
		.description('Unpack FFSInit or service/update .exe')
		.argument('<input>', 'path to .exe')
		.argument('[output]', 'output dir')
		.action(async function (input, output) {
			await unpackExe({input, output, ...this.optsWithGlobals()});
		});

	program.command('xbz2bin')
		.description('Convert .xbz/.xbi/.xbb files to fullflash.bin')
		.argument('<input>', 'path to .xbz')
		.argument('[output]', 'output file')
		.action(async function (input, output) {
			await xbzToFlash({input, output, ...this.optsWithGlobals()});
		});

	program.showHelpAfterError();
	program.parse();
})();
