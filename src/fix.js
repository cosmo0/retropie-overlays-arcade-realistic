const fs = require('fs');
const path = require('path');

const roms = "overlays-realistic/roms";

const ratio = (1080 / 720);

let files = fs.readdirSync(roms);
for (let i = 0; i < files.length; i++) {
    let f = files[i];

    if (!f.endsWith('.cfg')) { continue; }

    if (f.startsWith('_')) {
        console.log('%s is template - skip', f);
        continue;
    }

    console.log('Process %s', f);

    let conf = fs.readFileSync(path.join(roms, f), { encoding: 'utf8' });

    // check if has #include (uses 720p) but not video_fullscreen_x (redefines resolution)
    if (conf.indexOf('#include') >= 0 && conf.indexOf('video_fullscreen_x') < 0) {
        let width = parseInt(/custom_viewport_width[\s]*=[\s]*"([\d]+)"/igm.exec(conf)[1]);
        let height = parseInt(/custom_viewport_height[\s]*=[\s]*"([\d]+)"/igm.exec(conf)[1]);
        let x = parseInt(/custom_viewport_x[\s]*=[\s]*"([\d]+)"/igm.exec(conf)[1]);
        let y = parseInt(/custom_viewport_y[\s]*=[\s]*"([\d]+)"/igm.exec(conf)[1]);

        // resize to 1080p
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        x = Math.round(x * ratio);
        y = Math.round(y * ratio);

        conf = conf.replace(/custom_viewport_width[\s]*=[\s]*"([\d]+)"/img, 'custom_viewport_width = "' + width + '"');
        conf = conf.replace(/custom_viewport_height[\s]*=[\s]*"([\d]+)"/img, 'custom_viewport_height = "' + height + '"');
        conf = conf.replace(/custom_viewport_x[\s]*=[\s]*"([\d]+)"/img, 'custom_viewport_x = "' + x + '"');
        conf = conf.replace(/custom_viewport_y[\s]*=[\s]*"([\d]+)"/img, 'custom_viewport_y = "' + y + '"');

        // ensure orientation is ok
        if (width > height) {
            conf = conf.replace('common_arcade_v', 'common_arcade_h');
        } else {
            conf = conf.replace('common_arcade_h', 'common_arcade_v');
        }

        fs.writeFileSync(path.join(roms, f), conf);
        
        console.log('##### %s OK #####', f);
    } else {
        console.log('%s is John Merit - skip', f);
    }
}