const dialogGifCreator = document.querySelector('#dialogGifCreator')
const btnGifCreatorTool = document.querySelector('#btnGifCreatorTool')
const canvasGifCreator = document.querySelector('#canvasGifCreator');
const inGifCreatorWidth = document.querySelector('#inGifCreatorWidth');
const inGifCreatorHeight = document.querySelector('#inGifCreatorHeight');
const inGifCreatorColor = document.querySelector('#inGifCreatorColor');
const inGifCreatorFPS = document.querySelector('#inGifCreatorFPS');
const inGifCreatorName = document.querySelector('#inGifCreatorName');
const inGifCreatorLength = document.querySelector('#inGifCreatorLength');
const btnGifCreatorRecord = document.querySelector('#btnGifCreatorRecord');
const imgGifCreator = document.querySelector('#imgGifCreator');
const btnGifCreatorSave = document.querySelector('#btnGifCreatorSave');
const btnGifCreatorCancel = document.querySelector('#btnGifCreatorCancel');
const progressGifCreator = document.querySelector('#progressGifCreator');

let isSetup = false;
let config = {};
const encoder = new GIFEncoder();
import { capture } from './canvas.js';

/**
 * The function initialize, initializes the gif creator.
 */
export function initGifCreator({ svgCanvas, points }) {
    config.svgCanvas = svgCanvas;
    config.points = points;

    process();
}

function process() {
    // let ps = config.points.sort((a, b) => a.name > b.name).sort((a, b) => a.name.length > b.name.length);
    // inGifCreatorWidth.value = config.points[0]?config.points[0].name:'';
    // inGifCreatorHeight.value = config.points[config.points.length - 1]?config.points[config.points.length - 1].name:'';

    capture(config.svgCanvas, canvasGifCreator)
}

function hideAllPoints() {
    let ps = Array.from(config.svgCanvas.querySelectorAll('circle'))
        .forEach(p => {
            p.style.display = 'none';
        });
}

function showPoint(name) {
    if (name) {
        let p = config.svgCanvas.querySelector(`#point_${name}`);
        if (p && p.style) {
            p.style.display = 'initial';
        }
    }
}

btnGifCreatorRecord.addEventListener('click', event => {
    record({
        fps: inGifCreatorFPS.value,
        length: inGifCreatorLength.value,
        points: config.points,
        svgCanvas: config.svgCanvas
    })
})

async function record({ fps, length, points, svgCanvas }) {
    let numberOfFrames = fps * length;
    let numberOfPointsPerFrame = Math.ceil(points.length / numberOfFrames);
    hideAllPoints();
    let offset = 0;

    canvasGifCreator.style.display = 'block';
    imgGifCreator.style.display = 'none';

    canvasGifCreator.width = inGifCreatorWidth.value;
    canvasGifCreator.height = inGifCreatorHeight.value;

    encoder.setRepeat(0);
    encoder.setDelay(Math.round(1000 / fps));
    encoder.start();

    progressGifCreator.min = 0;
    progressGifCreator.max = numberOfFrames;
    progressGifCreator.style.display = 'block';

    for (let frame = 0; frame < numberOfFrames; frame++) {
        // Unhide points for frame
        let index = 0;

        for (index = index; index < numberOfPointsPerFrame; index++) {
            if (points[index + offset])
                showPoint(points[index + offset].name);
        }

        offset += index;

        let ctx = canvasGifCreator.getContext('2d');
        ctx.fillStyle = inGifCreatorColor.value;
        ctx.fillRect(0, 0, canvasGifCreator.width, canvasGifCreator.height)

        // Capture frame
        let context = await capture(svgCanvas, canvasGifCreator);
        encoder.addFrame(context);
        progressGifCreator.value = frame;
    }

    encoder.finish();

    canvasGifCreator.style.display = 'none';
    imgGifCreator.style.display = 'block';

    progressGifCreator.style.display = 'none';

    var binary_gif = encoder.stream().getData() //notice this is different from the as3gif package!
    var data_url = 'data:image/gif;base64,' + encode64(binary_gif);
    imgGifCreator.src = data_url;
}

btnGifCreatorSave.addEventListener('click', event => {
    let name = inGifCreatorName.value.length > 0 ? inGifCreatorName.value : 'codepuree_github_io';
    encoder.download(`${name}.gif`);
    dialogGifCreator.close();
})

btnGifCreatorCancel.addEventListener('click', event => {
    dialogGifCreator.close();
})