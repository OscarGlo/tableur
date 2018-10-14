let canvas, table;
let mouse = {
	x: 0, y: 0,
	click: 0
};
let key = [];

function fitCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

window.addEventListener("load", () => {
	canvas = document.getElementById("canvas");
	
	// Disable contextual menu on canvas
	canvas.oncontextmenu = function(e) {
		e.preventDefault();
	};
	
	// Fit canvas on window resize
	fitCanvas();
	window.addEventListener("resize", fitCanvas);
	
	table = new Table(10, 30, 75, 25);
	
	// Add update and draw on events
	["mousemove", "mouseup", "mousedown", "keyup", "keydown"].forEach(
		evt => window.addEventListener(evt, () => {
			table.update(mouse, key);
			table.draw(canvas);
		})
	);
});

// MOUSE EVENTS

window.addEventListener("mousemove", (evt) => {
	mouse.x = (evt.clientX < 1 ? 1 : evt.clientX);
	mouse.y = (evt.clientY < 1 ? 1 : evt.clientY);
});
window.addEventListener("mousedown", (evt) => mouse.click = evt.button + 1);
window.addEventListener("mouseup", () => mouse.click = 0);

// KEYBOARD EVENTS

window.addEventListener("keydown", (evt) => key[evt.key] = true);
window.addEventListener("keyup", (evt) => delete key[evt.key]);