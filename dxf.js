export class DXFWriter {
    constructor(config) {
        this.content = '';
        this.config = config;
    }

    /**
     * The function receives a list of points and an optional codelist and 
     * converts it into a string that contains the dxf representation.
     * 
     * @param {Point[]} points - Array of points
     * @param {PointCode[]} pointCodeList - Array of point codes
     * 
     * @returns {string} - String dxf representation of point array.
     */
    write({ points, pointCodeList }) {
        this._writeHeader();
        this._writeBody({ points, pointCodeList });
        this._writeFooter();

        return this.content;
    }

    _writeHeader() {
        this._startSection('ENTITIES');
    }

    _startSection(name) {
        this.content += `0\n`
            + `SECTION\n`
            + `2\n`
            + `${name}\n`;
    }

    _endSection() {
        this.content += '0\n'
            + 'ENDSEC\n';
    }

    _writeBody({ points, pointCodeList }) {
        this.content +=  '';

        for (let point of points) {
            this.createPoint(point, pointCodeList);
        }
    }

    _writeFooter() {
        this._endSection();
        this.content += '0\n'
            + 'EOF';
    }

    // Entities
    createPoint({ x, y, z, code, name }, pointCodeList) {
        let layerName = code;
        let pointCode = pointCodeList.find( x => x.code == code);

        if (pointCode) {
            layerName = `${pointCode.group.name}_${pointCode.name}`
                            .replace(',', '')
                            .replace('/', ' ')
                            .replace('ß', 'ss')
                            .replace('ä', 'ae')
                            .replace('ö', 'oe')
                            .replace('ü', 'ue');
            
            if (this.config.withCode) {
                layerName = `${code}_${layerName}`;
            }
        }

        if (this.config.defaultZ) {
            z = this.config.defaultZ;
        }

        this.content += '0\n'
            + 'POINT\n'
            + '8\n'
            + `${layerName}\n`
            + '10\n'
            + `${x}\n`
            + '20\n'
            + `${y}\n`
            + '30\n'
            + `${z}\n`;

        this.content += '0\n'
            + 'TEXT\n'
            + '1\n'
            + `${name}\n`
            + '8\n'
            + `${layerName}_txt\n`
            + '10\n'
            + `${x + 0.25}\n`
            + '20\n'
            + `${y}\n`
            + '30\n'
            + `${z}\n`
            + '40\n'
            + `0.5\n`
    }
}