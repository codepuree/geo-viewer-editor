/**
 * Transform
 * @typedef {Object} Transform
 * @property {Object} translation - Translation
 * @property {number} translation.x - Translation in x direction
 * @property {number} translation.y - Translation in y direction
 * @property {number} rotation - Rotation
 * @property {Object} scale - Scale
 * @property {number} scale.x - Scale in x direction
 * @property {number} scale.y - Scale in y direction
 */

/**
 * The function calculate_transform, calculates the translation and rotation 
 * between tow coordinate systems with an calculus of observations.
 * 
 * @param {Object[]} source - Coordinates from the source system
 * @param {number} source[].x - X value of coordinate
 * @param {number} source[].y - Y value of coordinate
 * @param {Object[]} target - Corresponding coordinates in the target
 *                                       system
 * @param {number} target[].x - X value of coordinate
 * @param {number} target[].y - Y value of coordinate
 * 
 * @returns {Transform}
 */
export function calculate_transform(source, target) {
    let numberOfCoordinates = Math.min(source.length, target.length);
    // Setting the initial transform parameters
    /** @type {Transform} */
    let transform = {
        translation: {
            x: target[0].x - source[0].x,
            y: target[0].y - source[0].y
        },
        rotation: 0,
        scale: {
            x: 1,
            y: 1
        }
    };

    // Setting up the design matrix
    let design = [];

    for (let i = 0; i < numberOfCoordinates; i++) {
        design.push([1, 0, (source[i].x - transform.rotation * source[i].y), 0, (transform.scale.x * (- source[i].y))]);
        design.push([0, 1, 0, (transform.rotation * source[i].x + source[i].y), (transform.scale.y * (- source[i].x))]);
    }

    // Setting up vector of observations
    let observations = [];

    for (let i = 0; i < numberOfCoordinates; i++) {
        observations.push(target[i].x - (transform.translation.x + transform.scale.x * (source[i].x - transform.rotation * source[i].y)));
        observations.push(target[i].y - (transform.translation.y + transform.scale.y * (transform.rotation * source[i].x + source[i].y)));
    }

    // Calculus of observations
    let N = math.chain(design)
        .transpose()
        .multiply(design)
        .done()

    let Q = math.inv(N);

    let dx = math.chain(Q)
        .multiply(math.transpose(design))
        .multiply(observations)
        .done()

    // Update transform
    transform.translation.x += dx[0];
    transform.translation.y += dx[1];
    transform.scale.x += dx[2];
    transform.scale.y += dx[3];
    transform.rotation += dx[4];

    return transform;
}

/**
 * 
 * @param {number} srcX 
 * @param {number} srcY 
 * @param {Transform} transform 
 */
export function transform(srcX, srcY, transform) {
    let translation = [
        [transform.translation.x, transform.translation.y]
    ];
    let scale = [
        [transform.scale.x, transform.scale.y]
    ];
    let rotation = [
        [1, -transform.rotation],
        [transform.rotation, 1]
    ];
    let src = [
        [srcX],
        [srcY]
    ];

    let dst = math.chain(rotation)
        .multiply(src)
        .done()

    dst[0] *= transform.scale.x;
    dst[1] *= transform.scale.y;

    dst = math.chain(translation)
        .add(dst)
        .done();

    return dst;
}

export function north2y(north, bounds) {
    return bounds.height - (north - bounds.minY);
}

export function east2x(east, bounds) {
    return east - bounds.minX;
}
