
[![NPM Version](https://img.shields.io/npm/v/%40sie-js%2Fsiemens-fw-tool)](https://www.npmjs.com/package/@sie-js/siemens-fw-tool)

# SUMMARY
Console utility for working with Siemens EGOLD/SGOLD firmware files (.exe, .xbz, .xbi, .xfs, .xbb, .exci, .exbi).

Supported .exe files:
- Converting service/update **.exe** to **.xbz**
- Converting FFSInit **.exe** to **.zip**
- Converting SCOUT to **.map** + **.xbz** + **.xfs**

Supported firmware files:
- Firmware: converting **.xbz** / **.xbi** to **.bin**
- FFS: converting **.xfs** to **.bin**
- BCORE: converting **.xbb** to **.bin**
- FACTORY: converting **.exci** / **.exbi** to **.bin**

Works on all OS: Linux, OSX, Windows

# INSTALL
**Linux & OSX**
1. Install the latest version of [NodeJS](https://nodejs.org/en/download/).
2. Install `siemens-fw-tool` package:
	```bash
    npm install -g @sie-js/siemens-fw-tool@latest
 	```

	Alternatively, you can use a `siemens-fw-tool` without installation:
	```bash
    # Just replace "siemens-fw-tool" to "npx @sie-js/siemens-fw-tool"
    npx @sie-js/siemens-fw-tool unpack-exe FFSInit_C81_2_ua-retail_43_0390.exe
    
    # Or use inside cloned repo
    git clone https://github.com/siemens-mobile-hacks/siemens-fw-tool && cd siemens-fw-tool && npm i
    node bin/siemens-fw-tool.js unpack-exe FFSInit_C81_2_ua-retail_43_0390.exe
	```

**Windows**

Download prebuilt `siemens-fw-tool.exe` from [releases](https://github.com/siemens-mobile-hacks/siemens-fw-tool/releases).

Alternatively, you can [install nodejs on windows](https://nodejs.org/en/download/) and use instruction for OSX/Linux.

# USAGE
```
Usage: siemens-fw-tool [options] [command]

CLI tool for Siemens FW files.

Options:
  -h, --help                       display help for command

Commands:
  unpack-exe <input> [output-dir]  Unpack FFSInit or service/update .exe
  fw2bin <input> [output-file]     Convert .xbz/.xbi/.xfs/.xbb/.exci/.exbi files to fullflash.bin
  help [command]                   display help for command
```
