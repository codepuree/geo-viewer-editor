const /** {HTMLInputElement} */inFile = document.querySelector('#inFile');
const inBackgroundImage = document.querySelector('#inBackgroundImage');
const btnExportXYZ = document.querySelector('#btnExportXYZ');
const inPointCodeList = document.querySelector('#inPointCodeList');
const layers = {};
const /** {SVGElement} */ svgCanvas = document.querySelector('#svgCanvas');
const layerWrapper = document.querySelector('#layerWrapper');
const layerBackgroundImage = document.querySelector('#layerBackgroundImage');
const svgPosX = document.querySelector('#svgPosX');
const svgPosY = document.querySelector('#svgPosY');
const progressMain = document.querySelector('#progressMain');
const progressStatus = document.querySelector('#progressStatus');
let filename = '';
/** @type {PointCode[]} */
let pointCodeList = [];

import { calculate_transform, transform, east2x, north2y } from './calculations.js';
import { renderPoint, getLayerNames } from './canvas.js';

let points = [];
let bounds = {};

// Type definitions
/** 
 * PointCode type definition
 * 
 * @typedef {object} PointCode - Code for a point
 * @property {string} code - Stored point code
 * @property {string} name - Human readable name
 * @property {object} group - Point code group
 * @property {string} group.code - Code for the point code group
 * @property {string} group.name - Human readable name for the point code group
 * @property {string} [symbol] - Identifier for a svg symbol
 * @property {string} [color] - String representation of an html color
 */

/**
 * Point type definition
 * 
 * @typedef {object} Point - Point
 * @property {string} name - Name of the point
 * @property {string} code - Code of the point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} z - Z coordinate
 */

/**
 * Bounds type definition
 * 
 * @typedef {object} Bounds - Bounds
 * @property {number} centerX - Center X
 * @property {number} centerY - Center Y
 * @property {number} minX - Minimum x
 * @property {number} maxX - Maximum x
 * @property {number} minY - Minimum y
 * @property {number} maxY - Maximum y
 * @property {number} width - Width (maxX - minX)
 * @property {number} height - Width (maxY - minY)
 */

// Events
inFile.addEventListener('change', event => {
    for (const file of inFile.files) {
        let fileExtension = file.name.split('.').pop();
        let fileHandler = null;

        switch (fileExtension) {
            case 'jxl': {
                filename = file.name.split('.')[0];
                fileHandler = readFileJXL(file);
            } break;

            case 'txt': {
                filename = file.name.split('.')[0];
                fileHandler = readFileTXT(file);
            } break;

            default: {
                warn(`The file extension '.${fileExtension}' of the file '${file.name}' is not know to the programm.`);
            } break;
        }

        if (fileHandler && fileHandler.then) {
            fileHandler
                .then(ps => {
                    points = ps;

                    const bounds = calculateBounds(points);

                    // svgCanvas.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
                    svgCanvas.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
                    const svgMain = svgCanvas.querySelector('#main');
                    svgMain.setAttribute('transform', `scale(1, -1) translate(0, ${2 * -bounds.centerY})`)

                    // Render points
                    for (let point of points) {
                        // renderPoint(point, bounds);
                        renderPoint(svgMain, point, 2, pointCodeList);
                    }
                    svgCanvas.innerHTML += '';
                    log(`There are ${points.length} points in the file.\n`
                        + `\tmin North: ${bounds.minY}\tmax North: ${bounds.maxY}\n`
                        + `\tmin East:  ${bounds.minX}\tmax East:  ${bounds.maxX}\n`
                        + `\twidth: ${bounds.width} height: ${bounds.height}`);

                    getLayerNames(svgMain).forEach(name => {
                        let container = layerWrapper;
                        let text = null;

                        if (pointCodeList.length > 0) {
                            let pointCode = pointCodeList.find(x => x.code === name);

                            if (pointCode && pointCode.group && pointCode.group.name) {
                                container = getAsideGroup(layerWrapper, pointCode.group.name);
                            } else {
                                container = getAsideGroup(layerWrapper, 'Unknown')
                            }

                            if (pointCode && pointCode.name) {
                                text = pointCode.name;
                            }
                        }

                        container.style.display = 'grid';
                        container.style.gridTemplateColumns = 'auto auto auto';
                        createLayerControl({ wrapper: container, name, text, canvas: svgMain });
                    })

                    // TODO: Remove
                    window.points = ps;
                })
                .catch(error => {
                    console.error(error.message, error.stack);
                })
        }
    }

    if (points.length >= 0) {
        btnExportXYZ.removeAttribute('disabled');
    }
});

inPointCodeList.addEventListener('change', event => {
    for (let file of inPointCodeList.files) {
        let fileExtension = file.name.split('.').pop();
        let fileHandler = null;

        switch (fileExtension) {
            case 'json':
                fileHandler = readFileAsJSON(file)
                break;

            default:
                warn(`The file extension '.${fileExtension}' of the file '${file.name}' is not know to the programm.`);
                break;
        }

        if (fileHandler.then) {
            fileHandler.then(newPointCodeList => {
                pointCodeList = pointCodeList.concat(newPointCodeList)
            })
        }
    }
});

btnExportXYZ.addEventListener('click', event => {
    let file = writeXYZ(points);
    download(file, filename + '.xyz', 'text/csv');
});

inBackgroundImage.addEventListener('change', event => {
    if (inBackgroundImage.files.length >= 0) {
        layerBackgroundImage.innerHTML = '';

        let imageFile = inBackgroundImage.files[0];

        let reader = new FileReader();
        reader.addEventListener('loadend', event => {
            let result = reader.result;

            let img = new Image();

            img.onload = event => {
                let image = document.createElement('image');
                image.setAttribute('xlink:href', result);
                // image.setAttribute('transform', 'scale(0.77, 0.76) translate(-50, -155) rotate(-0.2)');

                let trans = calculate_transform(
                    [{ id: '8', x: 4463462.49, y: 5331589.56 }, { id: '296', x: 4463681.6, y: 5331612.58 }, { id: '468', x: 4463411.25, y: 5331457.3 }],
                    [{ id: '8', x: 120, y: 538 }, { id: '296', x: 402, y: 505 }, { id: '468', x: 53, y: 706 }]
                );
                console.log('trans:', trans);
                // image.setAttribute('transform', /*`scale(1, 1) translate(0, 0) */`rotate(${trans.rotation})`);

                if (!svgCanvas.hasAttribute('viewBox')) {
                    svgCanvas.setAttribute('viewBox', `0 0 ${img.width} ${img.height}`)
                } else {
                    console.log(`image: w = ${img.width} h = ${img.height}`);
                    let viewBox = svgCanvas.viewBox.baseVal;
                    // image.setAttribute('translate', `translate(${viewBox.x},${viewBox.y})`)
                    image.setAttribute('x', trans.translation.x)
                    image.setAttribute('y', trans.translation.y)
                    image.setAttribute('width', Math.abs(viewBox.width * trans.scale.x))
                    image.setAttribute('height', Math.abs(viewBox.height * trans.scale.y))
                }

                document.querySelector('#layerBackgroundImage').appendChild(image);
                svgCanvas.innerHTML = svgCanvas.innerHTML;
            }

            img.src = result;
        });
        reader.readAsDataURL(imageFile)

    }
});

svgCanvas.addEventListener('pointermove', event => {
    const bcr = svgCanvas.getBoundingClientRect();
    const vb = svgCanvas.viewBox.baseVal !== null ? svgCanvas.viewBox.baseVal : { x: 0, y: 0, width: 0, height: 0 };

    let relativeX = event.clientX - bcr.x;
    let relativeY = event.clientY - bcr.y;

    let posX = relativeX / bcr.width * (vb.width === 0 && bcr.width > 0 ? bcr.width : vb.width);
    let posY = relativeY / bcr.height * (vb.height === 0 && bcr.height > 0 ? bcr.height : vb.height);

    svgPosX.innerText = `${posX.toFixed(2)} (${relativeX})`;
    svgPosY.innerText = `${posY.toFixed(2)} (${relativeY})`;
});

svgCanvas.addEventListener('pointerleave', event => {
    svgPosX.innerText = '---';
    svgPosY.innerText = '---';
})

/**
 * The function readFileAsText wraps the FileReader readAsText into an promise.
 * 
 * @param {File} file - File to read as text
 * 
 * @returns {Promise.<string, Error>} A promise that returns a string if 
 *      resolved, or an error if rejected.
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        let fileReader = new FileReader();

        fileReader.addEventListener('loadend', event => {
            progressMain.removeAttribute('min');
            progressMain.removeAttribute('max');
            progressMain.removeAttribute('value');
            progressStatus.innerHTML = `Status`;
            resolve(fileReader.result);
        });

        fileReader.onprogress = event => {
            progressMain.setAttribute('max', event.total);
            progressMain.setAttribute('value', event.loaded);
        }
        
        fileReader.addEventListener('error', event => {
            reject(fileReader.error);
        });
        
        progressMain.setAttribute('min', 0);
        progressStatus.innerHTML = `Loading '${file.name}'`;
        fileReader.readAsText(file);
    });
}

/**
 * The function readFileAsJSON parses a given file into JSON.
 * 
 * @param {File} file - File to parse
 * 
 * @returns {Promise.<object, Error>} A promise that returns an object if 
 * resolved, or error if rejected.
 */
function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
        readFileAsText(file)
            .then(text => {
                try {
                    resolve(JSON.parse(text));
                } catch (error) {
                    reject(error);
                }
            })
    });
}

/**
 * The function convertJxlToPoint converts the given .jxl point record into a 
 * point.
 * 
 * @param {HTMLElement} rawPoint - Raw point data
 * 
 * @returns {Point} - Point
 */
function convertJxlToPoint(rawPoint) {
    let point = {};

    point.name = rawPoint.Name ? rawPoint.Name : '';
    point.code = rawPoint.Code ? rawPoint.Code : '';

    if (rawPoint.Grid) {
        point.x = parseFloat(rawPoint.Grid.East);
        point.y = parseFloat(rawPoint.Grid.North);
        point.z = parseFloat(rawPoint.Grid.Elevation);
    } else if (rawPoint.ComputedGrid) {
        point.x = parseFloat(rawPoint.ComputedGrid.East);
        point.y = parseFloat(rawPoint.ComputedGrid.North);
        point.z = parseFloat(rawPoint.ComputedGrid.Elevation);
    }

    if (Number.isNaN(point.z)) {
        point.z = 0;
    }

    return point;
}

/**
 * The function readFileJXL, returns a promise of the read jxl file, that 
 * returns an array of points.
 * 
 * @param {File} file - File to read
 * 
 * @returns {Promise.<Point[], Error>} - Promise that contains the points array
 */
function readFileJXL(file) {
    return readFileAsText(file)
        .then(text => {
            return parseXML(text)
        })
        .then(/** {HTMLElement} */xml => {
            return new Promise((resolve, reject) => {
                /**
                 * @type {HTMLCollection} pointRecords - List of point records
                 */
                const pointRecords = xml.querySelectorAll('PointRecord');

                /**
                 * @type {Point[]} points - Array of points
                 */
                let points = [].slice.call(pointRecords).map(pointRecord => {
                    return convertJxlToPoint(xml2Object(pointRecord));
                });
                resolve(points)
            })
        })
}

/**
 * The function readFileTXT, returns a promise of the read .txt file, that 
 * returns an array of points.
 * 
 * @param {*} file 
 */
function readFileTXT(file) {
    return readFileAsText(file)
        .then(text => {
            return new Promise((resolve, reject) => {
                let lines = text.replace('\r\n', '\n').split('\n');
                let points = [];

                for (let line of lines) {
                    if (line && line.length > 0) {
                        let point = { name: '', code: '' };
                        line.trim().split(' ').forEach((value, index) => {
                            switch (index) {
                                case 0: {
                                    point.name = value;
                                } break;

                                case 1: {
                                    point.x = parseFloat(value);
                                } break;

                                case 2: {
                                    point.y = parseFloat(value);
                                } break;

                                case 3: {
                                    point.z = parseFloat(value)
                                } break;

                                case 4: {
                                    point.code = value;
                                } break;

                                default:
                                    break;
                            }
                        });

                        points.push(point);
                    }
                }

                resolve(points);
            });
        });
}

/**
 * The function writeXYZ, writes the given array of points into a .xyz file.
 * 
 * @param {string} filename - Name of the file
 * @param {Point[]} points - An array, that contains the points
 * 
 * @return {File} - A File containing converted points
 */
function writeXYZ(points) {
    let data = '';

    for (const point of points) {
        if (point) {
            data += `${point.x} ${point.y} ${point.z}\n`;
        }
    }

    return data;
}

/**
 * The function calculateBounds, calculates bounds from the given points.
 * 
 * @param {Point[]} points - List of points
 * 
 * @returns {Bounds} - Calculated bounds from the given points
 */
function calculateBounds(points) {
    let bounds = {};

    // Calculate min & max
    bounds.minX = points.reduce((accumulator, point) => {
        return Math.min(accumulator, point.x ? point.x : Number.MAX_SAFE_INTEGER);
    }, Number.MAX_SAFE_INTEGER);

    bounds.maxX = points.reduce((accumulator, point) => {
        return Math.max(accumulator, point.x ? point.x : Number.MIN_SAFE_INTEGER);
    }, Number.MIN_SAFE_INTEGER);

    bounds.minY = points.reduce((accumulator, point) => {
        return Math.min(accumulator, point.y ? point.y : Number.MAX_SAFE_INTEGER);
    }, Number.MAX_SAFE_INTEGER);

    bounds.maxY = points.reduce((accumulator, point) => {
        return Math.max(accumulator, point.y ? point.y : Number.MIN_SAFE_INTEGER);
    }, Number.MIN_SAFE_INTEGER);

    // Calculate width & height
    bounds.width = Math.abs(bounds.maxX - bounds.minX);
    bounds.height = Math.abs(bounds.maxY - bounds.minY);

    // Calculate center
    bounds.centerX = bounds.minX + bounds.width / 2;
    bounds.centerY = bounds.minY + bounds.height / 2;

    return bounds;
}

/**
 * The function download triggers a download of the given data with a given 
 * filename and mime type.
 * This is the initial implementation: @see {@link https://stackoverflow.com/a/30832210}
 * 
 * @param {string|Object} data - Data that should be download able
 * @param {string} filename - Name of the file
 * @param {string} type - MIME type of the file
 */
function download(data, filename, type) {
    if (typeof (data) !== 'string') {
        data = JSON.stringify(data, null, 2);
    }

    var file = new Blob([data], { type: type });

    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function parseXML(text) {
    return new Promise((resolve, reject) => {
        const parser = new DOMParser();

        let xml = parser.parseFromString(text, "text/xml");

        if (xml) {
            resolve(xml);
        } else {
            reject(xml);
        }
    });
}

/**
 * The function xml2Object, converts an given XML node into a javascript
 * object.
 * 
 * @param {Node} xml - XML object to convert
 * 
 * @return {object} - Converted javascript object
 */
function xml2Object(xml) {
    if (xml) {
        if (xml.children.length > 0) {
            let obj = {};

            for (const node of xml.children) {
                if (node.nodeName in obj) {
                    if (!Array.isArray(obj[node.nodeName])) {
                        let array = [obj[node.nodeName]];

                        obj[node.nodeName] = array;
                    }

                    obj[node.nodeName].push(xml2Object(node));
                } else {
                    obj[node.nodeName] = xml2Object(node);
                }
            }

            return obj;
        } else {
            return xml.innerHTML;
        }
    } else {
        return null;
    }
}

// Logging functions
function log(msg) {
    console.log(msg);
}

function warn(msg) {
    console.warn(msg);
}

function error(msg) {

    console.error(msg.message, msg.stack);
}

/**
 * @see {@link https://stackoverflow.com/a/1484514}
 */
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function createAsideGroup(wrapper, name) {
    let details = document.createElement('details');
    let summary = document.createElement('summary');
    let main = document.createElement('main');

    details.className = 'aside-group';

    summary.innerHTML = name;
    details.appendChild(summary);

    details.appendChild(main)
    wrapper.appendChild(details)    

    return main
}

function getAsideGroup(wrapper, name) {
    let details = Array.from(wrapper.querySelectorAll('details'))
        .find(x => {
            let summary = x.querySelector('summary');
            
            return summary.innerHTML.trim() === name.trim();
        })
    
    if (details) {
        let main = details.querySelector('main');
        return main;
    } else {
        return createAsideGroup(wrapper, name) 
    }
}

function createLayerControl({wrapper, name, text, canvas}) {
    let layer = canvas.querySelector(`#layer_${name}`);

    if (layer) {
        let number = Array.from(layer.querySelectorAll('circle')).length;
        let fillColor = getHexColor(layer.getAttribute('fill'));

        let checkbox = document.createElement('input');
        let color = document.createElement('input');
        let label = document.createElement('label');

        checkbox.type = 'checkbox';
        if (text) {
            label.innerText = `${text} [${name}] (${number})`;
        } else {
            label.innerText = `${name} (${number})`;
        }
        let id = `l_${name}`;
        checkbox.id = id;
        checkbox.checked = true;
        label.for = id;

        color.disabled = true;
        color.type = 'color';
        color.value = fillColor;

        checkbox.addEventListener('change', changeLayerVisibility(name));

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        wrapper.appendChild(color);
    }
}

function changeLayerVisibility(layerName) {
    return function (event) {
        let svgLayerName = `layer_${layerName.length > 0 ? layerName : '__default__'}`;
        console.log(`layerName: ${layerName} changed to `, this.checked);
        let layer = svgCanvas.querySelector(`#${svgLayerName}`);
        if (layer) {
            if (this.checked) {
                layer.removeAttribute('visibility');
            } else {
                layer.setAttribute('visibility', 'hidden');
            }
        }
    }
}

function getHexColor(color) {
    console.log('Color:', color);
    if (color.includes('rgb')) {
        color = color.replace('rgb(', '').replace(')', '')
        return color.split(',')
            .reduce((acc, cur) => {
                return acc + parseInt(cur.trim()).toString(16)
            }, '#')
    } else if (color.startsWith('#')) {
        return color;
    }
}

function getRGBColor(color) {
    if (color.includes('rgb')) {
        return color;
    } else if (color.startsWith('#')) {
        return 'rgb(' +
            color
                .match(/[a-f0-9]{2}/g)
                .map(x => {
                    return parseInt(x, 16)
                })
                .join(', ')
            + ')'
    }
}