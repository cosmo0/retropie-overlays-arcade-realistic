const fs = require('fs-extra');
const path = require('path');
const process = require('process');
const readlineSync = require('readline-sync');

// TODO: handle SAMBA shares

console.log('=== Overlay pack installer ===');

/**
 * Checks that the specified folder can be read, and possibly written to.
 * 
 * @param {String} folder The folder to check
 * @param {Boolean} checkWrite Whether to try to write into
 */
var checkAccess = function checkAccess (folder, checkWrite) {
    try {
        fs.ensureDirSync(folder);
    } catch (err) {
        console.error('The folder %s does not exist or cannot be read, and cannot be created!', folder);
        console.log('Exiting...');
        process.exit(1);
    }

    if (fs.existsSync(folder)) {
        if (checkWrite) {
            var testFile = path.join(folder, '_test-install.txt');
            try {
                fs.writeFileSync(testFile, 'test');
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                } else {
                    console.error('Unable to write files into the folder %s!', folder);
                    console.log('Exiting...');
                    process.exit(2);
                }
            } catch (err) {
                console.error('Unable to write files into the folder %s: %o', folder, err);
                console.log('Exiting...');
                process.exit(2);
            }

            console.log('%s can be written to', folder);
        } else {
            console.log('%s can be read', folder);
        }
    } else {
        console.error('The folder %s does not exist or cannot be read!', folder);
        console.log('Exiting...');
        process.exit(1);
    }
}

/**
 * Gets a boolean-type entry from the user
 * 
 * @returns {Boolean} true if the user has entered 'yes', 'y', 'true', or '1'
 */
var getBoolEntry = function getBoolEntry () {
    return [ 'y', 'yes', 'true', '1' ].indexOf(readlineSync.question('y/N: ').toLowerCase()) >= 0;
}

var pack = 'overlays';

checkAccess(pack, false);

// build pack paths
var packOverlays = path.join(pack, 'configs/all/retroarch/overlay/arcade/');
var packRoms = path.join(pack, 'roms');

// ask the path to the roms
console.log('');
console.log('1) Where are your roms located?');
console.log('(ex: /Volumes/roms/mame-libretro)');
var shareRoms = readlineSync.question('Path to the roms: ');

checkAccess(shareRoms, true);

// ask the path to retropie config folder
console.log('');
console.log('2) How can I access the retropie shared config folder?')
console.log('(ex: /Volumes/configs/)')
var shareConfigs = readlineSync.question('Path to the configs: ');
var shareOverlaysFolder = path.join(shareConfigs, 'all/retroarch/overlay/arcade');

checkAccess(shareOverlaysFolder, true);

// ask whether to overwrite files if any
console.log('');
console.log('3) Do you wish to overwrite existing files?');
var overwrite = getBoolEntry();

// ask whether to copy the roms if not found
console.log('');
console.log('4) If a config exists but the corresponding rom is not found, do you wish to copy the rom?');
var copyRom = getBoolEntry();

// ask where the romset is located
var romsetFolder = '';
if (copyRom) {
    console.log('');
    console.log('5) Where is your romset located ?');
    console.log('(ex: ~/Downloads/mame2003/roms ; leave empty to cancel');
    romsetFolder = readlineSync.question('Path to the romset: ');
}

// list the available rom configs
console.log('');
console.log('=== COPYING FILES ===');
var availableConfigs = fs.readdirSync(path.join(pack, 'roms'));
for (let cfg of availableConfigs) {
    // only process config files
    if (!cfg.endsWith('.cfg')) {
        continue;
    }

    // copy template files
    if (cfg.startsWith('_')) {
        if (overwrite || !fs.existsSync(path.join(shareRoms, cfg))) {
            console.log('--- Copy template %s', cfg);
            fs.copyFileSync(path.join(packRoms, cfg), path.join(shareRoms, cfg));
        }

        continue;
    }

    let zipFileName = cfg.replace('.cfg', '');

    console.log('--- Processing %s', cfg);

    // check if the matching rom exists
    if (!fs.existsSync(path.join(shareRoms, zipFileName))) {
        if (copyRom) {
            if (fs.existsSync(path.join(romsetFolder, zipFileName))) {
                console.log('copy rom');
                fs.copyFileSync(path.join(romsetFolder, zipFileName), path.join(shareRoms, zipFileName));
            } else {
                console.log('>>>>> ROM %s DOES NOT EXIST IN YOUR ROMSET', zipFileName);
                continue;
            }
        } else {
            console.log('rom does not exist, skipping');
            continue;
        }
    }

    // copy the rom config
    if (overwrite || !fs.existsSync(path.join(shareRoms, cfg))) {
        console.log('copy rom config');
        fs.copyFileSync(path.join(packRoms, cfg), path.join(shareRoms, cfg));
    }

    // read the rom config to get the overlay instead of hard-coding it
    let cfgContent = fs.readFileSync(path.join(packRoms, cfg), { encoding: 'utf-8' });
    let overlayFile = /input_overlay[\s]*=[\s]*(.*\.cfg)/igm.exec(cfgContent)[1]; // extract overlay path
    overlayFile = overlayFile.substring(overlayFile.lastIndexOf('/')); // just the file name
    let packOverlayFile = path.join(packOverlays, overlayFile); // concatenate with pack path

    if (fs.existsSync(packOverlayFile)) {
        // copy the overlay config
        if (overwrite || !fs.existsSync(path.join(shareOverlaysFolder, overlayFile))) {
            console.log('copy overlay config');
            fs.copyFileSync(packOverlayFile, path.join(shareOverlaysFolder, overlayFile));
        }

        // get the overlay image file name
        let overlayContent = fs.readFileSync(packOverlayFile, { encoding: 'utf-8' });
        let overlayImage = /overlay0_overlay[\s]*=[\s]*(.*\.png)/igm.exec(overlayContent)[1]

        // copy the overlay image
        if (overwrite || !fs.existsSync(path.join(shareOverlaysFolder, overlayImage))) {
            console.log('copy overlay image');
            fs.copyFileSync(path.join(packOverlays, overlayImage), path.join(shareOverlaysFolder, overlayImage));
        }
    } else {
        console.error('Overlay config not found: ' + packOverlayFile);
        process.exit(1);
    }

    console.log('--- done');
}

console.log('All roms configs have been copied');

// copy common config if any
var commonCfg = path.join(pack, 'configs/all/retroarch/overlay_cfg');
if (fs.existsSync(commonCfg)) {
    console.log('');
    console.log('=== COPYING COMMON CONFIGS ===')

    // check if folder exists on the share
    let shareCommonCfg = path.join(shareConfigs, 'all/retroarch/overlay_cfg');
    fs.ensureDirSync(shareCommonCfg);

    // copy common config files
    let commonCfgFiles = fs.readdirSync(commonCfg);
    for (let cfg of commonCfgFiles) {
        if (overwrite || !fs.existsSync(path.join(shareCommonCfg, cfg))) {
            console.log('Copy ' + cfg);
            fs.copyFileSync(path.join(commonCfg, cfg), path.join(shareCommonCfg, cfg));
        }
    }

    console.log('Common configs have been copied');
}

// copy shaders
console.log('');
console.log('=== COPYING SHADERS ===');
var shaders = path.join(pack, 'configs/all/retroarch/shaders');
var shareShaders = path.join(shareConfigs, 'all/retroarch/shaders');
fs.copySync(shaders, shareShaders, { overwrite: overwrite });
console.log('Shaders have been copied');