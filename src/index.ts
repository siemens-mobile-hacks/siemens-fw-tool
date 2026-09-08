import path from 'node:path';
import fs from 'node:fs';
import type { XbiInfo, XbiInfoMemoryRegion, XbiSplitInfo } from "@sie-js/fw";
import {
	convertXbiToFlash,
	detectExeType,
	extractFromExe,
	getVersionFromFFS,
	getXbiExtension,
	isXbi,
	parseXbi
} from "@sie-js/fw";
import { sprintf } from 'sprintf-js';
import JSZip from 'jszip';
import { getBorderCharacters, table as asciiTable } from 'table';
import chalk from 'chalk';

interface CmdInfoArgv {
	input: string;
}

interface CmdUnpackArgv {
	input: string;
	outputDir?: string;
}

interface CmdFwToBinArgv {
	input: string;
	outputFile?: string;
}

interface ExtractedFile {
	name: string;
	buffer: Buffer;
}

const tableConfig = {
	singleLine: true,
	border: getBorderCharacters('void')
};

export async function info(argv: CmdInfoArgv): Promise<void> {
	const buffer = fs.readFileSync(argv.input);
	if (isXbi(buffer)) {
		return await infoXbi(argv, buffer);
	} else if (detectExeType(buffer)) {
		return await infoExe(argv, buffer);
	} else {
		console.error(`Unknown file format!`);
	}
}

async function infoExe(argv: CmdInfoArgv, buffer: Buffer): Promise<void> {
	console.log(`Exe type: ${detectExeType(buffer)}`);

	const files = await unpackFilesFromExe(argv.input, buffer);
	console.log(`Files count: ${files.length}`);

	let index = 0;
	for (const file of files) {
		console.log('');
		const contentType = detectContentType(file.buffer);
		console.log(chalk.bold(`File #${index}:`), file.name, `(${contentType})`);
		if (isXbi(file.buffer))
			await infoXbi(argv, file.buffer);
		index++;
	}
}

async function infoXbi(argv: CmdInfoArgv, buffer: Buffer): Promise<void> {
	const xbi = parseXbi(buffer, true);

	const infoTable = [
		['Title', 'Value'],
	];

	const addRow = (k: string, v: any): void => {
		infoTable.push([chalk.bold(`${k}:`), v.toString()]);
	};

	addRow('type', detectContentType(buffer));

	for (const k in xbi) {
		const v = xbi[k as keyof XbiInfo];
		switch (k as keyof XbiInfo) {
			case "dll":
				if (typeof v === 'string') {
					infoTable.push([chalk.bold(k), v.replace(/[\x00\x01]/g, '')]);
				}
				break;

			case "dataChunks":
				if (Array.isArray(v)) {
					addRow(k, v.length);
				}
				break;

			case "hashArea":
				// skip
				break;

			case "unknown":
				if (typeof v === 'object' && v !== null) {
					for (const [id, value] of Object.entries(v)) {
						addRow(`${k}[${id}]`, Buffer.isBuffer(value) ? value.toString('hex') : JSON.stringify(value));
					}
				}
				break;

			case "mapInfo":
				if (Array.isArray(v)) {
					let i = 0;
					for (const mapInfo of v) {
						addRow(`${k}[${i}]`, mapInfo.toString('hex'));
						i++;
					}
				}
				break;

			case "dataFlash":
			case "eraseRegions":
				if (Array.isArray(v)) {
					let i = 0;
					for (const eraseRegion of v as XbiInfoMemoryRegion[]) {
						addRow(`${k}[${i}]`, sprintf("%08X-%08X", eraseRegion.from, eraseRegion.to));
						i++;
					}
				}
				break;

			case "splitInfo":
				if (v) {
					const splitInfo = v as XbiSplitInfo;
					addRow(k, sprintf("%08X (ID: %08X)", splitInfo.addr, splitInfo.id));
				}
				break;

			case "statisticAddr":
				if (v != null && typeof v == "number") {
					addRow(k, sprintf("%08X", v));
				}
				break;

			case "flashSize":
				if (v != null && typeof v == "number") {
					addRow(k, sprintf("%d (%s Mb)", v, v / 1024 / 1024));
				}
				break;

			default:
				if (Buffer.isBuffer(v)) {
					infoTable.push([chalk.bold(k), Buffer.from(v).toString('hex')]);
				} else if (typeof v == "object" && v !== null) {
					addRow(k, JSON.stringify(v));
				} else if (v !== undefined) {
					addRow(k, v);
				}
				break;
		}
	}

	const output = asciiTable(infoTable, tableConfig)
		.split('\n')
		.map(line => line.trimEnd())
		.join('\n')
		.trim();
	console.log(output);
}

async function unpackFilesFromExe(originalFileName: string, buffer: Buffer): Promise<ExtractedFile[]> {
	const extractedFiles = extractFromExe(buffer);
	if (!extractedFiles)
		return [];

	let index = 0;
	const files: ExtractedFile[] = [];

	for (const extractedFile of extractedFiles) {
		const contentType = detectContentType(extractedFile);

		let fileName = extractedFiles.length > 0 ?
			`${path.basename(originalFileName)}[${index}].${contentType}` :
			`${path.basename(originalFileName)}.${contentType}`;
		try {
			if (contentType == 'map') {
				const match = extractedFile.toString().match(/<([^>]+)>\s*$/si);
				fileName = match?.[1]?.replace(/_2D/g, '-') || fileName;
			} else if (contentType == 'xfs') {
				const xfsVersion = getVersionFromFFS(convertXbiToFlash(extractedFile));
				if (xfsVersion)
					fileName = xfsVersion + ".xfs";
			} else if (isXbi(extractedFile)) {
				const xbiInfo = parseXbi(extractedFile, true) as XbiInfo;
				if (xbiInfo && xbiInfo.langpack) {
					const lgpid = +xbiInfo.langpack.replace(/^lg/, '');
					if (xbiInfo.model && xbiInfo.svn !== undefined) {
						if (xbiInfo.t9 != null && !isNaN(lgpid)) {
							fileName = sprintf("%s_%02d%02d%02d.%s", xbiInfo.model, xbiInfo.svn, lgpid, xbiInfo.t9, contentType);
						} else if (!isNaN(lgpid)) {
							fileName = sprintf("%s_%02d%02d.%s", xbiInfo.model, xbiInfo.svn, lgpid, contentType);
						} else {
							fileName = sprintf("%s_%02d.%s", xbiInfo.model, xbiInfo.svn, contentType);
						}
					}
				}
			} else if (contentType == 'zip') {
				const zip = await (new JSZip()).loadAsync(extractedFile);
				const zipFile = zip.file("Config/ccq_vinfo.txt");
				if (zipFile) {
					const zipFileContent = await zipFile.async("string");
					fileName = zipFileContent.split(/\r\n|\n/)[0] + ".zip";
				}
			}
		} catch (e) {
			console.error(e);
		}

		fileName = fileName.replace(/\//g, '_');

		files.push({
			name: fileName,
			buffer: extractedFile
		});

		index++;
	}

	return files;
}

export async function unpackExe(argv: CmdUnpackArgv): Promise<void> {
	const outDir = argv.outputDir ?? ".";
	if (!fs.existsSync(outDir))
		fs.mkdirSync(outDir, { recursive: true });

	const files = await unpackFilesFromExe(argv.input, fs.readFileSync(argv.input));
	for (const file of files) {
		console.log(`${outDir}/${file.name}`);
		fs.writeFileSync(`${outDir}/${file.name}`, file.buffer);
	}
}

export async function xbiToFlash(argv: CmdFwToBinArgv): Promise<void> {
	const xbi = fs.readFileSync(argv.input);
	const fullflash = convertXbiToFlash(xbi);
	const outFile = argv.outputFile ?? (path.basename(argv.input) + ".bin");
	console.log(outFile);
	fs.writeFileSync(outFile, fullflash);
}

export function detectContentType(buffer: Buffer): string {
	if (isXbi(buffer)) {
		const xbi = parseXbi(buffer, true);
		if (!xbi)
			throw new Error(`Can't parse XBI!`);
		return getXbiExtension(xbi);
	} else if (buffer.subarray(0, 4).equals(Buffer.from("504B0304", "hex"))) {
		return 'zip';
	} else if (buffer.subarray(0, 13).equals(Buffer.from("[MapFileInfo]"))) {
		return 'map';
	} else if (buffer.subarray(0, 2).equals(Buffer.from("MZ"))) {
		const extracted = extractFromExe(buffer);
		if (extracted)
			return detectContentType(extracted[0]) + ".exe";
		return 'bin';
	} else {
		return 'bin';
	}
}
