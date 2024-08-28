import path from 'node:path';
import fs from 'node:fs';
import { convertXbiToFlash, detectExeType, extractFromExe, getVersionFromFFS, getXbiExtension, isXbi, parseXbi } from "@sie-js/fw";
import { sprintf } from 'sprintf-js';
import JSZip from 'jszip';
import { table as asciiTable, getBorderCharacters } from 'table';
import chalk from 'chalk';

const tableConfig = {
	singleLine: true,
	border: getBorderCharacters('void')
};

export async function info(argv) {
	let buffer = fs.readFileSync(argv.input);
	if (isXbi(buffer)) {
		return await infoXbi(argv, buffer);
	} else if (detectExeType(buffer)) {
		return await infoExe(argv, buffer);
	} else {
		console.error(`Unknown file format!`);
	}
}

async function infoExe(argv, buffer) {
	console.log(`Exe type: ${detectExeType(buffer)}`);

	let files = await unpackFilesFromExe(argv.input, buffer);
	console.log(`Files count: ${files.length}`);

	let index = 0;
	for (let file of files) {
		console.log('');
		let contentType = detectContentType(file.buffer);
		console.log(chalk.bold(`File #${index}:`), file.name, `(${contentType})`);
		if (contentType == 'xfs' || contentType == 'xbb' || contentType == 'xbi' || contentType == 'xbz')
			await infoXbi(argv, file.buffer);
		index++;
	}
}

async function infoXbi(argv, buffer) {
	let xbi = parseXbi(buffer, true);

	let infoTable = [
		['Title', 'Value'],
	];

	let addRow = (k, v) => {
		infoTable.push([chalk.bold(`${k}:`), v.toString()]);
	};

	addRow('type', detectContentType(buffer));

	for (let k in xbi) {
		let v = xbi[k];
		switch (k) {
			case "dll":
				infoTable.push([chalk.bold(k), v.replace(/[\0\1]/g, '')]);
			break;

			case "writes":
				// skip
			break;

			case "mapInfo":
			{
				let i = 0;
				for (let mapInfo of v) {
					addRow(`${k}[${i}]`, mapInfo.toString('hex'));
					i++;
				}
			}
			break;

			case "dataFlash":
			case "eraseRegions":
			{
				let i = 0;
				for (let eraseRegion of v) {
					addRow(`${k}[${i}]`, sprintf("%08X-%08X", eraseRegion.from, eraseRegion.to));
					i++;
				}
			}
			break;

			case "swCode":
				addRow(k, sprintf("%08X: %08X", v.addr, v.value));
			break;

			default:
				if (Buffer.isBuffer(v)) {
					infoTable.push([chalk.bold(k), Buffer.from(v).toString('hex')]);
				} else if (typeof v == "object") {
					addRow(k, JSON.stringify(v));
				} else {
					addRow(k, v);
				}
			break;
		}
	}
	console.log(asciiTable(infoTable, tableConfig).trim());
}

async function unpackFilesFromExe(originalFileName, buffer) {
	let extractedFiles = extractFromExe(buffer);

	let index = 0;
	let files = [];
	for (let extractedFile of extractedFiles) {
		let contentType = detectContentType(extractedFile);

		let fileName = extractedFiles.length > 0 ?
			`${path.basename(originalFileName)}[${index}].${contentType}` :
			`${path.basename(originalFileName)}.${contentType}`;
		try {
			if (contentType == 'map') {
				fileName = extractedFile.toString().match(/<([^>]+)>\s*$/si)?.[1].replace(/_2D/g, '-') || fileName;
			} else if (contentType == 'xfs') {
				let xfsVersion = getVersionFromFFS(convertXbiToFlash(extractedFile));
				if (xfsVersion)
					fileName = xfsVersion + ".xfs";
			} else if (contentType == 'xbb' || contentType == 'xbi' || contentType == 'xbz') {
				let xbiInfo = parseXbi(extractedFile, true);
				let lgpid = +xbiInfo.langpack.replace(/^lg/, '');
				if (xbiInfo.t9 != null) {
					fileName = sprintf("%s_%02d%02d%02d.%s", xbiInfo.model, xbiInfo.svn, lgpid, xbiInfo.t9, contentType);
				} else {
					fileName = sprintf("%s_%02d%02d.%s", xbiInfo.model, xbiInfo.svn, lgpid, contentType);
				}
			} else if (contentType == 'zip') {
				let zip = await (new JSZip()).loadAsync(extractedFile);
				let zipFile = zip.file("Config/ccq_vinfo.txt");
				if (zipFile) {
					let zipFileContent = await zipFile.async("string");
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

export async function unpackExe(argv) {
	let outDir = argv.outputDir ?? ".";
	if (!fs.existsSync(outDir))
		fs.mkdirSync(outDir, { recursive: true });

	let files = await unpackFilesFromExe(argv.input, fs.readFileSync(argv.input));
	for (let file of files) {
		console.log(`${outDir}/${file.name}`);
		fs.writeFileSync(`${outDir}/${file.name}`, file.buffer);
	}
}

export async function xbiToFlash(argv) {
	let xbi = fs.readFileSync(argv.input);
	let fullflash = convertXbiToFlash(xbi);
	let outFile = argv.outputFile ?? (path.basename(argv.input) + ".bin");
	console.log(outFile);
	fs.writeFileSync(outFile, fullflash);
}

function detectContentType(buffer) {
	if (isXbi(buffer)) {
		let xbiInfo = parseXbi(buffer, true);
		return getXbiExtension(xbiInfo);
	} else if (buffer.subarray(0, 4).equals(Buffer.from("504B0304", "hex"))) {
		return 'zip';
	} else if (buffer.subarray(0, 13).equals(Buffer.from("[MapFileInfo]"))) {
		return 'map';
	} else {
		return 'bin';
	}
}
