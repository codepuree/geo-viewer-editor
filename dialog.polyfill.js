function testNecessityOfPolyfill() {
    let dialog = document.createElement('dialog');

    return typeof(dialog.showModal) === 'function';
}

if (!testNecessityOfPolyfill()) {
    document.querySelectorAll('dialog').forEach(dialog => {
        // Add missing functions
        dialog.show = _ => {
            dialog.style.display = 'block';
        };

        let isModal = false;
        dialog.showModal = _ => {
            let bcr = dialog.getBoundingClientRect();
            isModal = true;
            dialog.style.position = 'fixed';
            dialog.style.top   = `${(window.innerHeight - bcr.height) / 2}px`;
            dialog.style.width = `${(window.innerWidth  - bcr.width ) / 2}px`;
            dialog.show();
        };

        dialog.close = _ => {
            dialog.style.display = 'none';

            if (isModal) {
               dialog.style.position = 'initial';
               dialog.style.top = 'initial';
               dialog.style.left = 'initial';
               isModal = false;
            }
        };

        if (dialog.hasAttribute('open')) {
            dialog.show();
        } else {
            dialog.close();
        }
    })
}