/*
* Checks that the files are all correctly configured
*/

const fs = require('fs-extra');
const path = require('path');
const readlineSync = require('readline-sync');
const sharp = require('sharp');

let templateOverlay = fs.readFileSync('src/template-overlay.cfg', { encoding: 'utf-8' });

// check all packs
let packs = fs.readdirSync('.').filter(dir => dir.startsWith('overlays'));
for (let pack of packs) {
    console.log('');
    console.log('');
    console.log('========== PACK %s ==========', pack);

    let templateRom = fs.readFileSync('src/template-game.cfg', { encoding: 'utf-8' });
    let romsFolder = pack;
    let overlaysFolder = path.join(pack, 'overlays');

    let usedOverlays = [];

    console.log('===== Checking roms =====');

    let romsFiles = fs.readdirSync(romsFolder).filter(file => file.endsWith('.cfg') && !file.startsWith('_'));
    for (let romFile of romsFiles) {
        // get overlay file path
        let cfgContent = fs.readFileSync(path.join(romsFolder, romFile), { encoding: 'utf-8' });
        let overlayFile = /input_overlay[\s]*=[\s]*(.*\.cfg)/igm.exec(cfgContent)[1]; // extract overlay path
        overlayFile = overlayFile.substring(overlayFile.lastIndexOf('/')); // just the file name
        let packOverlayFile = path.join(overlaysFolder, overlayFile); // concatenate with pack path
    
        usedOverlays.push(overlayFile);

        // check that the overlay file exists
        if (!fs.existsSync(packOverlayFile)) {
            console.log('> Overlay %s for rom %s does not exist', packOverlayFile, romFile);
            readlineSync.keyInPause();
        }
    }

    console.log('%i roms processed', romsFiles.length);

    console.log('');
    console.log('===== Checking overlays =====');

    let overlaysFiles = fs.readdirSync(overlaysFolder).filter(file => file.endsWith('.cfg') && !file.startsWith('_'));
    let overlayPromises = [];
    for (let overlayFile of overlaysFiles) {
        // get image file name
        let overlayContent = fs.readFileSync(path.join(overlaysFolder, overlayFile), { encoding: 'utf-8' });
        let overlayImage = /overlay0_overlay[\s]*=[\s]*"?(.*\.png)"?/igm.exec(overlayContent)[1];
        let overlayImageFile = path.join(overlaysFolder, overlayImage);

        // check that the image exists
        if (!fs.existsSync(overlayImageFile)) {
            console.log('> Image file %s for overlay %s does not exist', overlayImage, overlayFile);
            readlineSync.keyInPause();
        } else {
            // resize the overlay if necessary
            var img = sharp(overlayImageFile);
            overlayPromises.push({ promise: img.metadata(), img, file: overlayImageFile });
        }

        // check that a rom config uses this overlay
        if (!usedOverlays.indexOf(overlayFile)) {
            console.log('> Overlay %s is not used by any rom config');
            if (readlineSync.keyInYNStrict('Do you wish to create it?')) {
                fs.writeFileSync(
                    path.join(romsFolder, overlayFile.replace('.cfg', '.zip.cfg')),
                    templateRom.replace('{{game}}', overlayFile.replace('.cfg', '')));
            }
        }
    }

    console.log('%i overlays processed', overlaysFiles.length);

    if (overlayPromises.length > 0) {
        console.log('');
        console.log('===== Resize overlays =====');

        overlayPromises.forEach(p => {
            p.promise.then(meta => {
                // make sure the image is resized in 1080p
                if (meta.width > 1920 || meta.height > 1080) {
                    console.log('> Must resize the image %s to 1080p', p.file);
                    return p.img
                        .resize(1920, 1080)
                        .crop(sharp.strategy.center)
                        .toBuffer();
                }
            }).then(buffer => {
                if (buffer && buffer != null) {
                    fs.writeFileSync(p.file, buffer);
                    console.log('> Resize OK - %s', p.file);
                }
            });
        });
    }
}
