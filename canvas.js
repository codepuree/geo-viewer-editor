/**
 * 
 * @param {SVGElement} canvas 
 * @param {Point} param1 
 * @param {Number} r 
 * @param {PointCode[]} codeList 
 */
export function renderPoint(canvas, { x, y, code }, r, codeList) {
    let layer = canvas;
    let circle = document.createElement('circle');

    if (!layer.getAttribute('id').includes('layer_'))
        layer = getLayer(canvas, code);

    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', r);

    let [ pointCode ] = codeList.filter(x => x.code == code)
    if (pointCode) {
        // if (pointCode.color) {
        //     circle.setAttribute('fill', pointCode.color);
        // }

        if (pointCode.symbol) {
            renderSymbol(layer, { x, y, symbol: pointCode.symbol, color: pointCode.color });
        }
    }

    layer.appendChild(circle);
}

function renderSymbol(canvas, { x, y, symbol, color }) {
    let use = document.createElement('use');
    
    use.setAttribute('href', symbol);
    use.setAttribute('x', x);
    use.setAttribute('y', y);
    use.setAttribute('stroke', color);
    use.setAttribute('fill', color);
    
    canvas.appendChild(use);
}

function addLayer(canvas, uniqueName) {
    let layer = document.createElement('g');

    layer.setAttribute('id', `layer_${uniqueName}`);
    layer.setAttribute('fill', `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`);

    canvas.appendChild(layer);

    return layer;
}

function getLayer(canvas, uniqueName) {
    let layer = canvas.querySelector(`#layer_${uniqueName}`);

    if (!layer)
        layer = addLayer(canvas, uniqueName)
    
    return layer
}

export function getLayerNames(canvas) {
    return Array.from(canvas.querySelectorAll('g'))
        .filter(x => x.id.includes('layer_'))
        .map(x => x.id.replace('layer_', ''))
}