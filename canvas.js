/**
 * 
 * @param {SVGElement} canvas 
 * @param {Point} param1 
 * @param {Number} r 
 * @param {PointCode[]} codeList 
 */
export function renderPoint(canvas, { x, y, code, name }, r, codeList) {
    let layer = canvas;
    let circle = document.createElement('circle');

    if (!layer.getAttribute('id').includes('layer_'))
        layer = getLayer(canvas, code);

    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', r);
    circle.setAttribute('id', `point_${name}`)

    let [ pointCode ] = codeList.filter(x => x.code == code)
    if (pointCode) {
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

export function capture(svgCanvas, canvas) {
    return new Promise((resolve, reject) => {
        let context = canvas.getContext('2d');
        
        let data = btoa(svgCanvas.outerHTML);
        
        let img = new Image();
        let url = '';
        
        img.onload = () => {
            // context.clearRect(0, 0, canvas.width, canvas.height)
            let width = img.width;
            let  height = img.height;
            // if (img.width > canvas.width) {
                height = img.height / img.width * canvas.width;
                width = canvas.width;
            // }

            if (img.height > canvas.height) {
                width = img.width / img.height * canvas.height;
                height = canvas.height;
            }
            
            console.log(`Image:\tw=${img.width} | h=${img.height}\nCanvas:\tw=${canvas.width} | h=${canvas.height}`);
            context.drawImage(img, Math.round((canvas.width - width) / 2), Math.round((canvas.height - height) / 2), width, height);
            
            canvas.toBlob(blob => {
                var newImg = document.createElement('img'),
                url = URL.createObjectURL(blob);
                
                newImg.onload = function () {
                    // no longer need to read the blob so it's revoked
                    URL.revokeObjectURL(url);
                    resolve(context);
                };
                
                newImg.src = url;
            });
        }
        
        img.src = 'data:image/svg+xml;base64,' + data;
    });
}