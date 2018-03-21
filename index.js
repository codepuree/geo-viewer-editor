const /** {HTMLInputElement} */inFile = document.querySelector('#inFile');
const btnProcess = document.querySelector('#inProcess');
const layers = {};
const svgCanvas = document.querySelector('#svgCanvas');
const layerWrapper = document.querySelector('#layerWrapper');

const pointCodeList = /** {PointCode[]}*/[
    /** {PointCode} */{ code: '141', name: 'Laubbaum', group: { code: '140', name: 'Solitärbepflanzung' }, symbol: '#symbol_broadleaf-tree', color: 'darkgreen' },
    /** {PointCode} */{ code: '112', name: 'Mülleimer', group: { code: '110', name: 'Infrastrukturobjekte' }, symbol: '#symbol_trash', color: 'darkgray' },
];

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

// Events
inFile.addEventListener('change', event => {
    for (const file of inFile.files) {
        let fileExtension = file.name.split('.').pop();
        switch (fileExtension) {
            case 'jxl':
                readFileJXL(file)
                    .then(text => {
                        return parseXML(text)
                    })
                    .then(/** {HTMLElement} */xml => {
                        const pointRecords = xml.querySelectorAll('PointRecord');
                        const points = [].slice.call(pointRecords).map(pointRecord => {
                            return xml2Object(pointRecord);
                        });

                        const minNorth = points.reduce((accumulator, point) => {
                            if (point && point.Grid && point.Grid.North) {
                                return Math.min(accumulator, parseFloat(point.Grid.North));
                            } else {
                                return Math.min(accumulator, Number.MAX_SAFE_INTEGER);
                            }
                        }, Number.MAX_SAFE_INTEGER);
                        const maxNorth = points.reduce((accumulator, point) => {
                            if (point && point.Grid && point.Grid.North) {
                                return Math.max(accumulator, parseFloat(point.Grid.North));
                            } else {
                                return Math.max(accumulator, Number.MIN_SAFE_INTEGER);
                            }
                        }, Number.MIN_SAFE_INTEGER);
                        const minEast = points.reduce((accumulator, point) => {
                            if (point && point.Grid && point.Grid.East) {
                                return Math.min(accumulator, parseFloat(point.Grid.East));
                            } else {
                                return Math.min(accumulator, Number.MAX_SAFE_INTEGER);
                            }
                        }, Number.MAX_SAFE_INTEGER);
                        const maxEast = points.reduce((accumulator, point) => {
                            if (point && point.Grid && point.Grid.East) {
                                return Math.max(accumulator, parseFloat(point.Grid.East));
                            } else {
                                return Math.max(accumulator, Number.MIN_SAFE_INTEGER);
                            }
                        }, Number.MIN_SAFE_INTEGER);

                        const height = Math.abs(maxNorth - minNorth);
                        const width = Math.abs(maxEast - minEast);

                        // svgCanvas.setAttribute('viewBox', `${minEast} ${maxNorth} ${maxEast} ${minNorth}`);
                        svgCanvas.setAttribute('viewBox', `0 0 ${width} ${height}`);

                        const bounds = {
                            minNorth: minNorth,
                            maxNorth: maxNorth,
                            minEast: minEast,
                            maxEast: maxEast
                        }

                        // Position
                        console.log('Point 1:', points.filter(point => {
                            return point.Name === '1' || point.Name === '8';
                        }));
                        console.log(`Point 1:\n\tx: ${east2x(4463572.33, bounds)}\n\ty: ${north2y(5331738.93, bounds)}`);
                        console.log(`Point 8:\n\tx: ${east2x(4463462.49, bounds)}\n\ty: ${north2y(5331589.56, bounds)}`);

                        // Render background
                        // let imgPath = './baseMap.PNG';
                        // let imageLayer = document.createElement('g');
                        // let image = document.createElement('image');
                        // image.setAttribute('xlink:href', imgPath);
                        // imageLayer.appendChild(image);
                        // imageLayer.setAttribute('transform', `scale(0.76, 0.77) translate(-197.9199999999255, -269.17700000014156)`);
                        // svgCanvas.appendChild(imageLayer);

                        // Render points
                        for (point of points) {
                            renderPoint(point, bounds);
                        }
                        svgCanvas.innerHTML += '';
                        console.log(points[0]);
                        log(`There are ${pointRecords.length} (${points.length}) points in the file.
                        \tmin North: ${minNorth}\tmax North: ${maxNorth}
                        \tmin East:  ${minEast}\tmax East:  ${maxEast}
                        \twidth: ${width} height: ${height}`);

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
                break;

            default:
                warn(`The file extension '.${fileExtension}' of the file '${file.name}' is not know to the programm.`);
                break;
        }
    }
});

function readFileJXL(file) {
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
    let height = (bounds.maxNorth - bounds.minNorth);

    return height - (north - bounds.minNorth);
}

function east2x(east, bounds) {
    return east - bounds.minEast;
}

function renderPoint(point, bounds) {
    if (!layers[point.Code]) {
        layers[point.Code] = {
            color: getRandomColor(),
            number: 0
        };

        let layer = document.createElement('g');
        layer.id = `layer_${point.Code.length > 0 ? point.Code : '__default__'}`;
        svgCanvas.appendChild(layer);
    }

    layers[point.Code].number++;

    // <circle cx="60" cy="60" r="50"/>
    let circle = document.createElement('circle');
    if (point) {
        let x = null;
        let y = null;

        if (point.Grid && point.Grid.North && point.Grid.East) {
            x = east2x(parseFloat(point.Grid.East), bounds);
            y = north2y(parseFloat(point.Grid.North), bounds);
        } else if (point.ComputedGrid && point.ComputedGrid.North && point.ComputedGrid.East) {
            x = east2x(parseFloat(point.ComputedGrid.East), bounds);
            y = north2y(parseFloat(point.ComputedGrid.North), bounds);
        }

        let symbol = null;

        if (x && y) {
            let /** {PointCode} */pointCodeDefinitions = pointCodeList.filter((/** {PointCode} */pointCode) => {
                return pointCode.code === point.Code;
            });

            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', 1);
            circle.setAttribute('fill', layers[point.Code].color);

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
                        symbol.setAttribute('stroke', layers[point.Code].color);
                    }
                }

                if (pointCodeDefinition.color) {
                    circle.setAttribute('fill', pointCodeDefinition.color);
                }
            }
        }

        let layerName = `layer_${point.Code.length > 0 ? point.Code : '__default__'}`;
        let layer = svgCanvas.querySelector(`#${layerName}`);

        if (layer) {
            layer.appendChild(circle);
            
            if (symbol) {
                layer.appendChild(symbol);
            }
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
    return function(event) {
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