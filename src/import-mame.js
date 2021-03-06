var fs = require('fs-extra');
var path = require('path');

var readlineSync = require('readline-sync');
var xml2js = require('xml2js');
var sharp = require('sharp');
var admzip = require('adm-zip');
var imagemin = require('imagemin');
const { kill, off } = require('process');
const { createCanvas, loadImage } = require('canvas');

/**************************************************
* MAME ARTWORK PACK IMPORTER
*
* Usage:
* - edit the variables below: source, outputRom, outputOvl to the proper paths
* - run with "node src/import-mame.js"
* - fix the rom configs/positions manually for each rom file
***************************************************/

/*******************
* DEFINE PATHS
********************/

/*
* A MAME layout file can have several bezels to choose from.
* This variable defaults the chosen bezel to the first found in the file.
* Otherwise, you will be prompted for each bezel.
*/
var useFirstBezel = true;

/*
* Source folder of the overlays.
* This folder should contain the MAME overlays zip files to import.
*/
var source = "tmp/source/";

/*
* Output folder for the rom config files.
* These files define the screen position and the overlay config to use,
* among other things.
*/
var outputRom = "tmp/output/roms";
fs.ensureDirSync(outputRom);

/*
* Output folder for the overlay config and image.
*/
var outputOvl = "tmp/output/overlay";
fs.ensureDirSync(outputOvl);

/*******************
* Initialize objects
********************/

// xml parser
var parser = new xml2js.Parser();

// config template
var templateGame = fs.readFileSync('src/template-game.cfg', { encoding: 'utf-8' });
var templateOverlay = fs.readFileSync('src/template-overlay.cfg', { encoding: 'utf-8' });

/*******************
* PROCESS SOURCE
********************/

// whether to overwrite existing files
let overwrite = readlineSync.keyInYNStrict('Do you wish to overwrite existing files ?');

// get existing artworks
var files = fs.readdirSync(source);
let requests = files.reduce((promisechain, file, index) => {
    return promisechain.then(() => new Promise((resolve, reject) => {
        var game = file.replace('.zip', '');

        if (!file.endsWith('.zip')) { resolve(); return; }
    
        console.log("########## PROCESSING " + file + " ##########");
    
        // initialize unzipper for this artwork
        var zip = new admzip(path.join(source, file));
    
        // get layout file name
        var zipEntries = zip.getEntries();
        var layoutFile = zipEntries.filter(entry => entry.entryName.endsWith('.lay'))[0].entryName;

        console.log(game + ' layout file: ' + layoutFile);
        
        // parse the layout file
        parser.parseString((zip.readAsText(layoutFile)), function (parseErr, layout) {
            if (parseErr) reject(parseErr);

            var view;
    
            // if there are multiple views, ask the user which one to use
            if (!useFirstBezel && layout.mamelayout.view.length > 1) {
                console.log('----------------');
                console.log('Please choose which bezel you want:');
                for (var v = 0; v < layout.mamelayout.view.length; v++) {
                    console.log(v + ': ' + layout.mamelayout.view[v].$.name  + ' (bezel name: ' + layout.mamelayout.view[v].bezel[0].$.element + ')');
                }
                console.log('');
                var chosenView = "x";
                while (isNaN(chosenView)) {
                    chosenView = readlineSync.question('Bezel to use: ');
                }
                view = layout.mamelayout.view[Number(chosenView)];
            } else {
                view = layout.mamelayout.view[0];
            }
    
            // source resolution = bezel x/y/w/h (=> error if x/y != 0)
            var sourceResolution = { width: 1920, height: 1080 };

            // get bezel file name
            var bezelFile = layout.mamelayout.element.map(function(element, idx) {
                for (var b = 0; b < view.bezel.length; b++) {
                    if (element.image && element.$.name === view.bezel[b].$.element) {
                        // check that bezel starts at 0,0
                        if (view.bezel[b].bounds[0].$.x != '0' || view.bezel[b].bounds[0].$.y != '0') {
                            if (!readlineSync.keyInYNStrict('Bezel has a x/y != 0. Continue?')) {
                                kill(0);
                            }
                        } else {
                            sourceResolution = view.bezel[b].bounds[0].$;
                            console.log(game + ' bounds ok');
                        }

                        return element.image[0].$.file;
                    }
                }
            })[0];
            
            console.log(game + ' image: ' + bezelFile);
    
            // ==================== COMPUTE POSITIONS ====================

            // get x/y/w/h from screen.bounds = get base screen position
            var screenPos = view.screen[0].bounds[0].$;
            screenPos.x = Number(screenPos.x);
            screenPos.y = Number(screenPos.y);
            screenPos.width = Number(screenPos.width);
            screenPos.height = Number(screenPos.height);

            console.log(game + ' source coordinates: ' + JSON.stringify(screenPos));
    
            // compute orientation
            var orientation = parseInt(screenPos.width) > parseInt(screenPos.height) ? "horizontal" : "vertical";
            console.log(game + ' orientation: ' + orientation);
    
            // compute original center: cx = x + (w / 2) => (cx: 640, cy: 360)
            var cx = screenPos.x + (screenPos.width / 2);
            var cy = screenPos.y + (screenPos.height / 2);

            // load cfg file, if there is one
            let cfgFile = path.join(source, game + '.cfg');
            if (fs.existsSync(cfgFile)) {
                console.log(game + ' has a cfg file');

                parser.parseString(fs.readFileSync(cfgFile), function (parseErr, cfg) {
                    if (parseErr) reject(parseErr);

                    const screen = cfg.mameconfig.system[0].video[0].screen[0];
                    if (!screen) {
                        console.log(game + ' has a CFG file without screen offset');
                        return;
                    }

                    const offset = {
                        hoffset: Number(screen.$.hoffset),
                        voffset: Number(screen.$.voffset),
                        hstretch: Number(screen.$.hstretch),
                        vstretch: Number(screen.$.vstretch)
                    };

                    console.log(game + ' offset: ' + JSON.stringify(offset));

                    // multiply w/h by stretch = get target screen size, centered => NEW DIMENSIONS AT SOURCE RESOLUTION
                    if (offset.hstretch) { screenPos.width = screenPos.width * offset.hstretch; }
                    if (offset.vstretch) { screenPos.height = screenPos.height * offset.vstretch; }

                    // compute new base x/y (top/left): x = cx - (w / 2)
                    screenPos.x = cx - (screenPos.width / 2);
                    screenPos.y = cy - (screenPos.height / 2);

                    // apply offset: x = x + ((hres / w * h) * hoffset) ; y = y + (vres * voffset) => NEW POSITION at source resolution
                    if (offset.hoffset) {
                        if (orientation == "horizontal") {
                            screenPos.x = screenPos.x = ((sourceResolution.width / screenPos.width * screenPos.height) * offset.hoffset);
                        } else {
                            screenPos.x = screenPos.x + (sourceResolution.width * offset.hoffset);
                        }
                    }

                    if (offset.voffset) {
                        if (orientation == "horizontal") {
                            screenPos.y = screenPos.y = (sourceResolution.height * offset.voffset);
                        } else {
                            screenPos.y = screenPos.y + ((sourceResolution.height / screenPos.height * screenPos.width) * offset.voffset);
                        }
                    }
                });
            } else {
                console.log(game + ' doesnt have a cfg file');
            }

            // apply target resolution (x * 1920 / 1280) => NEW COORDINATES IN 1080p
            screenPos.x = Math.round(screenPos.x * 1920 / sourceResolution.width);
            screenPos.width = Math.round(screenPos.width * 1920 / sourceResolution.width);
            screenPos.y = Math.round(screenPos.y * 1080 / sourceResolution.height);
            screenPos.height = Math.round(screenPos.height * 1080 / sourceResolution.height);

            console.log(game + ' target coordinates: ' + JSON.stringify(screenPos));

            // ==================== EXTRACT BEZEL IMAGE ====================

            // extract the bezel image
            console.log(game + ' extracting image...');
            var outputImage = path.join(outputOvl, game + '.png');
            if (overwrite && fs.existsSync(outputImage)) {
                fs.unlinkSync(outputImage);
            }
    
            if (overwrite || !fs.existsSync(outputImage)) {
                // sometimes the image in the lay file doesn't have the right case
                let zipImage = zipEntries.filter(entry => entry.entryName.toLowerCase() === bezelFile.toLowerCase())[0].entryName;

                zip.extractEntryTo(zipImage, outputOvl, false, true);
                fs.renameSync(path.join(outputOvl, bezelFile), outputImage);
            }
    
            // process the bezel image
            console.log(game + ' processing image...');
            var img = sharp(outputImage);
            img.metadata()
            .then(function(meta) {
                // make sure the image is resized in 1080p
                if (meta.width > 1920 || meta.height > 1080) {
                    console.log(game + ' resizing the image...');
                    return img
                        .resize(1920, 1080, {
                            fit: "cover",
                            position: "center"
                        })
                        .toBuffer();
                }

                console.log(game + ' image is OK');
                return img.toBuffer();
            }).then((buffer) => {
                // ==================== DEBUG: DRAW TARGET POSITION ====================
                loadImage(buffer)
                .then((imgCanvas) => {
                    // draw a rectangle where the screen will be
                    const canvas = createCanvas(1920, 1080);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imgCanvas, 0, 0, 1920, 1080);
                    ctx.strokeStyle = 'rgb(255,0,0)';
                    ctx.lineWidth = 5;
                    ctx.strokeRect(screenPos.x, screenPos.y, screenPos.width, screenPos.height);
                    // save in debug folder
                    let debugFolder = path.join(outputOvl, 'debug');
                    fs.ensureDirSync(debugFolder);
                    fs.writeFileSync(path.join(debugFolder, game + '.png'), canvas.toBuffer());
                });
                
                return buffer;
            }).then(function (buffer) {
                // ==================== OUTPUT OVERLAY ====================

                // optimize the file to reduce the size
                console.log(game + ' optimizing the image...');
                imagemin.buffer(buffer)
                .then(function(bufferOptim) {
                    // save the overlay file
                    if (overwrite || !fs.existsSync(outputImage)) {
                        fs.writeFileSync(outputImage, bufferOptim);
                        console.log(game + ' image optimized');
                    }
    
                    // create the libretro cfg file for the overlay
                    var outputOvlFile = path.join(outputOvl, game + '.cfg');
                    if (overwrite || !fs.existsSync(outputOvlFile)) {
                        fs.writeFileSync(outputOvlFile, templateOverlay.replace('{{game}}', game));
                        console.log(game + ' overlay config written');
                    }
    
                    // create the libretro cfg file for the rom
                    var outputRomFile = path.join(outputRom, game + '.zip.cfg');
                    if (overwrite || !fs.existsSync(outputRomFile)) {
                        var gameConfig = templateGame.replace('{{orientation}}', orientation)
                            .replace('{{game}}', game)
                            .replace('{{width}}', screenPos.width)
                            .replace('{{height}}', screenPos.height)
                            .replace('{{x}}', screenPos.x)
                            .replace('{{y}}', screenPos.y);
                        fs.writeFileSync(outputRomFile, gameConfig);
                        console.log(game + ' rom config written');

                        resolve();
                    } else {
                        resolve();
                    }
                });
            });
        });
    }));
}, Promise.resolve());

requests.then(() => {
    console.log('##### DONE #####');
})