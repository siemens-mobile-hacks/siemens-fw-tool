import path from 'node:path';
import fs from 'node:fs';
import { convertXbzToFlash, extractFromExe, isXbz, parseXbz } from "@sie-js/fw";
import { sprintf } from 'sprintf-js';
import JSZip from 'jszip';

export async function unpackExe(argv) {
	let extractedFiles = extractFromExe(fs.readFileSync(argv.input));

	let outDir = argv.output ?? path.basename(argv.input);
	if (!fs.existsSync(outDir))
		fs.mkdirSync(outDir, { recursive: true });

	let index = 0;
	let usedFiles = {};
	for (let extractedFile of extractedFiles) {
		let contentType = detectContentType(extractedFile);

		let fileName = `${path.basename(argv.input)}.${contentType}`;
		if (contentType == 'map') {
			fileName = extractedFile.toString().match(/<([^>]+)>\s*$/si)?.[1] || fileName;
		} else if (contentType == 'xfs' || contentType == 'xbb' || contentType == 'xbz') {
			let xbzInfo = parseXbz(extractedFile);
			let lgpid = +xbzInfo.langpack.replace(/^lg/, '');
			fileName = sprintf("%s_%02d%02d%02d.%s", xbzInfo.model, xbzInfo.svn, lgpid, xbzInfo.t9, contentType);
		} else if (contentType == 'zip') {
			let zip = await (new JSZip()).loadAsync(extractedFile);
			let zipFile = zip.file("Config/ccq_vinfo.txt");
			if (zipFile) {
				let zipFileContent = await zipFile.async("string");
				fileName = zipFileContent.split(/\r\n|\n/)[0] + ".zip";
			}
		}

		fileName = fileName.replace(/\//g, '_');

		if (usedFiles[fileName]) {
			let newFileName = fileName.replace(/\.([\w\d]+)$/i, '[' + usedFiles[fileName] + ']$1');
			usedFiles[fileName]++;
			fileName = newFileName;
		} else {
			usedFiles[fileName] = 1;
		}

		console.log(`${outDir}/${fileName}`);
		fs.writeFileSync(`${outDir}/${fileName}`, extractedFile);

		index++;
	}
}

export async function xbzToFlash(argv) {
	let xbz = fs.readFileSync(argv.input);
	let fullflash = convertXbzToFlash(xbz);
	let outFile = argv.output ?? (path.basename(argv.input) + ".bin");
	console.log(outFile);
	fs.writeFileSync(outFile, fullflash);
}

function detectContentType(buffer) {
	if (isXbz(buffer)) {
		let xbzInfo = parseXbz(buffer);
		if (xbzInfo.updateType == 'ExtendedNewSplit') {
			return 'xfs';
		} else if (xbzInfo.baseline1 == 'klf_bootcore') {
			return 'xbb';
		}
		return 'xbz';
	} else if (buffer.subarray(0, 4).equals(Buffer.from("504B0304", "hex"))) {
		return 'zip';
	} else if (buffer.subarray(0, 13).equals(Buffer.from("[MapFileInfo]"))) {
		return 'map';
	} else {
		return 'bin';
	}
}
