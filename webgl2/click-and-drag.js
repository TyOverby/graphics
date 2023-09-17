function track(element, callback) {
    function onMouseDown(event) {
        let shiftX = event.pageX;
        let shiftY = event.pageY;

        function onMouseMove(event) {
            callback(event.pageX - shiftX, event.pageY - shiftY);
            shiftX = event.pageX;
            shiftY = event.pageY;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener("mouseup", onMouseUp, { once: true });

    }
    element.addEventListener("mousedown", onMouseDown);
    //document.addEventListener("dragstart", () => { return false; });
    return {
        stopTracking: () => element.removeEventListener("mousedown", onMouseDown)
    };
}

export default track;