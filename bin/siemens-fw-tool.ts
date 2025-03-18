#!/usr/bin/env node
import { program, Command } from "commander";
import { unpackExe, xbiToFlash, info } from "../src/index.js";

(async () => {
	program
		.description('CLI tool for Siemens FW files.');

	program.command('info')
		.description('Into about fw files.')
		.argument('<input>', 'path to WinSwup or .exe files')
		.action(async function(this: Command, input: string) {
			await info({ input });
		});

	program.command('unpack-exe')
		.description('Unpack FFSInit or service/update .exe')
		.argument('<input>', 'path to .exe')
		.argument('[output-dir]', 'output dir')
		.action(async function(this: Command, input: string, outputDir?: string) {
			await unpackExe({ input, outputDir });
		});

	program.command('fw2bin')
		.description('Convert WinSwup files to fullflash.bin')
		.argument('<input>', 'path to .xbi')
		.argument('[output-file]', 'output file')
		.action(async function(this: Command, input: string, outputFile?: string) {
			await xbiToFlash({ input, outputFile });
		});

	program.showHelpAfterError();
	program.parse();
})();
