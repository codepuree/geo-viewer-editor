const /** {HTMLInputElement} */inFile = document.querySelector('#inFile');
const inBackgroundImage = document.querySelector('#inBackgroundImage');
const btnProcess = document.querySelector('#inProcess');
const btnExportXYZ = document.querySelector('#btnExportXYZ');
const layers = {};
const /** {SVGElement} */ svgCanvas = document.querySelector('#svgCanvas');
const layerWrapper = document.querySelector('#layerWrapper');
const layerBackgroundImage = document.querySelector('#layerBackgroundImage');
const svgPosX = document.querySelector('#svgPosX');
const svgPosY = document.querySelector('#svgPosY');
let filename = '';
const pointCodeList = /** {PointCode[]}*/[
    /** {PointCode} */{ code: '141', name: 'Laubbaum', group: { code: '140', name: 'Solitärbepflanzung' }, symbol: '#symbol_broadleaf-tree', color: 'darkgreen' },
    /** {PointCode} */{ code: '112', name: 'Mülleimer', group: { code: '110', name: 'Infrastrukturobjekte' }, symbol: '#symbol_trash', color: 'darkgray' },
];

// let points = [];
let points = [];

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

                    svgCanvas.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);

                    // Render background
                    let imgPath = './baseMap.PNG';
                    let imageLayer = document.createElement('g');
                    let image = document.createElement('image');
                    image.setAttribute('xlink:href', imgPath);
                    imageLayer.appendChild(image);
                    imageLayer.setAttribute('transform', `scale(0.76, 0.77) translate(-197.9199999999255, -269.17700000014156)`);
                    svgCanvas.appendChild(imageLayer);

                    // Render points
                    for (point of points) {
                        renderPoint(point, bounds);
                    }
                    svgCanvas.innerHTML += '';
                    console.log(points[0]);
                    log(`There are ${points.length} points in the file.
                \tmin North: ${bounds.minY}\tmax North: ${bounds.maxY}
                \tmin East:  ${bounds.minX}\tmax East:  ${bounds.maxX}
                \twidth: ${bounds.width} height: ${bounds.height}`);

                    for (let layerName in layers) {
                        let checkbox = document.createElement('input');
                        let color = document.createElement('input');
                        let label = document.createElement('label');

                        checkbox.type = 'checkbox';
                        label.innerText = `${layerName} (${layers[layerName].number})`;
                        let id = `l_${layerName}`;
                        checkbox.id = id;
                        checkbox.checked = true;
                        label.for = id;

                        color.disabled = true;
                        color.type = 'color';
                        color.value = layers[layerName].color;

                        checkbox.addEventListener('change', changeLayerVisibility(layerName));

                        layerWrapper.appendChild(checkbox);
                        layerWrapper.appendChild(label);
                        layerWrapper.appendChild(color);
                    }
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

            let image = document.createElement('image');
            image.setAttribute('xlink:href', result);
            image.setAttribute('transform', 'scale(0.77, 0.76) translate(-50, -155) rotate(-0.2)');

            layerBackgroundImage.appendChild(image);
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
 *      resolved, or an Error if rejected.
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        let fileReader = new FileReader();

        fileReader.addEventListener('loadend', event => {
            resolve(fileReader.result);
        });

        fileReader.addEventListener('error', event => {
            reject(fileReader.error);
        });

        fileReader.readAsText(file);
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

    bounds.width = Math.abs(bounds.maxX - bounds.minX);
    bounds.height = Math.abs(bounds.maxY - bounds.minY);

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

function north2y(north, bounds) {
    return bounds.height - (north - bounds.minY);
}

function east2x(east, bounds) {
    // console.log(`${east - bounds.minX} = ${east} - ${bounds.minX}`);
    return east - bounds.minX;
}

/**
 * The function renderPoint renders a given point in the svgCanvas.
 * 
 * @param {Point} point - Point to render
 * @param {Bounds} bounds - Bounds of all coordinates
 */
function renderPoint(point, bounds) {
    if (!layers[point.code]) {
        layers[point.code] = {
            color: getRandomColor(),
            number: 0
        };

        let layer = document.createElement('g');
        layer.id = `layer_${point.code.length > 0 ? point.code : '__default__'}`;
        svgCanvas.appendChild(layer);
    }

    layers[point.code].number++;

    let symbol = null;
    let circle = document.createElement('circle');
    let x = east2x(point.x, bounds);
    let y = north2y(point.y, bounds);

    if (x && y) {
        let /** {PointCode} */pointCodeDefinitions = pointCodeList.filter((/** {PointCode} */pointCode) => {
            return pointCode.code === point.code;
        });

        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 1);
        circle.setAttribute('fill', layers[point.code].color);

        if (pointCodeDefinitions.length === 1) {
            let pointCodeDefinition = pointCodeDefinitions[0];
            // <use href="#symbol_broadleaf-tree" transform="translate(-5, -20)" x="0" y="0" />
            if (pointCodeDefinition.symbol) {
                symbol = document.createElement('use');
                symbol.setAttribute('href', pointCodeDefinition.symbol);
                symbol.setAttribute('x', x);
                symbol.setAttribute('y', y);
                symbol.setAttribute('transform', 'translate(-5, -20)');

                if (pointCodeDefinition.color) {
                    symbol.setAttribute('stroke', pointCodeDefinition.color);
                } else {
                    symbol.setAttribute('stroke', layers[point.code].color);
                }
            }

            if (pointCodeDefinition.color) {
                circle.setAttribute('fill', pointCodeDefinition.color);
            }
            svgCanvas.appendChild(symbol);
        }
    }

    let layerName = `layer_${point.code.length > 0 ? point.code : '__default__'}`;
    let layer = svgCanvas.querySelector(`#${layerName}`);

    if (layer) {
        layer.appendChild(circle);

        if (symbol) {
            layer.appendChild(symbol);
        }
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