function TableException(str) {
	this.message = str;
	this.name = "TableException";
	this.toString = () => this.name + ": " + this.message;
}

function cursor(cur) {
	document.body.style.cursor = cur;
}

CanvasRenderingContext2D.prototype.line = function(x, y, sx, sy) {
	this.beginPath();
	this.moveTo(x, y);
	this.lineTo(x + sx, y + sy);
	this.stroke();
};

class Cell {
	constructor(table, col, row) {
		this.table = table;
		this.col = col;
		this.row = row;
		
		this.expr = "";
		
		this.selected = false;
		this.selected2 = false;
		this.ctrl = false;
	}
	
	get pos() {
		return {
			x: table.getX(this.col),
			y: table.getY(this.row)
		};
	}
	
	get size() {
		return {
			x: table.cols[this.col],
			y: table.rows[this.row]
		};
	}
	
	get value() {
		try {
			return (this.expr === "" ? "" : evalExpr(this.table.parseRefs(this.expr, this)));
		} catch (ex) {
			if (ex instanceof EvalException) return "!ERR";
			else if (ex instanceof TableException) return "!REF";
		}
	}
	
	get name() {
		let ncol = this.col + 1;
		let name = "";
		while (ncol > 0) {
			name = String.fromCharCode((ncol - 1) % 26 + 65) + name;
			ncol = Math.floor((ncol - 1) / 26);
		}
		return name + (this.row + 1);
	}
}

class Table {
	constructor(cols, rows, colsize, rowsize) {
		this.cols = Array(cols).fill(colsize);
		this.rows = Array(rows).fill(rowsize);
		this.cells = Array.from({length: this.cols.length}, () => new Array(this.rows.length));
		
		this.xoff = 30;
		this.yoff = 30;
		
		for (let i = 0; i < this.cols.length; i++)
			for (let j = 0; j < this.rows.length; j++)
				this.cells[i][j] = new Cell(this, i, j);
	}
	
	// Run function on each cell
	forEachCell(fun) {
		this.cells.forEach((row, c) => row.forEach((cell, r) => fun(cell, c, r)));
	}
	
	// Run function on each cell from some cell to some cell (coordinates or Cell objects)
	forEachCellIn(c1, r1, c2, r2, fun) {
		if (r2 != null && fun != null) // Treat as coordinates
			for (let i = Math.min(c1, c2); i <= Math.max(c1, c2); i++)
				for (let j = Math.min(r1, r2); j <= Math.max(r1, r2); j++)
					fun(this.cells[i][j], i, j);
		else // Treat as cells
			this.forEachCellIn(c1.col, c1.row, r1.col, r1.row, c2);
	}
	
	// Replace refs
	parseRefs(str, cell) {
		// Replace refs of form A1:B5
		str = str.replace(/\$?([a-z]+)\$?([0-9]+):\$?([a-z]+)\$?([0-9]+)/gi, (match, c1, r1, c2, r2) => {
			let tmp = "";
			this.forEachCellIn(Table.asCol(c1), r1 - 1, Table.asCol(c2), r2 - 1, (cell2) => {
				tmp += cell2.name + ",";
			});
			return tmp.substring(0, tmp.length - 1);
		});
		
		// Replace simple refs
		str = str.replace(/\$?([a-z]+)\$?([0-9]+)/gi, (match, c, r) => {
			let cell2 = this.cells[Table.asCol(c)][r - 1];
			if (cell2.expr.includes(cell.name))
				throw new TableException("Self referencing cell " + cell.name);
			return (cell2.value === "" ? 0 : cell2.value);
		});
		
		return str;
	}
	
	draw(canvas) {
		let ctx = canvas.getContext("2d");
		
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		ctx.strokeStyle = "#aaa";
		ctx.lineWidth = 2;
		
		ctx.font = "15px monospace";
		ctx.textBaseline = "middle";
		
		let selected = [];
		let expr = "";
		
		this.forEachCell((cell) => {
			if (cell.selected) {
				ctx.fillStyle = "#ddf";
				if (expr === "")
					expr = cell.expr;
				else
					expr = "Multiple cells selected";
				selected.push(cell);
			} else
				ctx.fillStyle = "#fff";
			
			if (cell.selected2)
				ctx.fillStyle = "#fdd";
			
			ctx.fillRect(cell.pos.x, cell.pos.y, cell.size.x, cell.size.y);
			ctx.strokeRect(cell.pos.x, cell.pos.y, cell.size.x, cell.size.y);
			
			ctx.fillStyle = "#333";
			ctx.fillText(cell.value, cell.pos.x + 5, cell.pos.y + cell.size.y / 2);
		});
		
		ctx.fillText(expr, 10, 10);
		
		ctx.strokeStyle = "#888";
		ctx.lineWidth = 4;
		
		// Draw selection border
		selected.forEach(cell => {
			//ctx.strokeRect(cell.pos.x, cell.pos.y, cell.size.x, cell.size.y);
			if (this.cells[cell.col] == null || this.cells[cell.col][cell.row - 1] == null || !this.cells[cell.col][cell.row - 1].selected)
				ctx.line(cell.pos.x, cell.pos.y, cell.size.x, 0);
			if (this.cells[cell.col - 1] == null || this.cells[cell.col - 1][cell.row] == null || !this.cells[cell.col - 1][cell.row].selected)
				ctx.line(cell.pos.x, cell.pos.y, 0, cell.size.y);
			if (this.cells[cell.col + 1] == null || this.cells[cell.col + 1][cell.row] == null || !this.cells[cell.col + 1][cell.row].selected)
				ctx.line(cell.pos.x + cell.size.x, cell.pos.y, 0, cell.size.y);
			if (this.cells[cell.col] == null || this.cells[cell.col][cell.row + 1] == null || !this.cells[cell.col][cell.row + 1].selected)
				ctx.line(cell.pos.x, cell.pos.y + cell.size.y, cell.size.x, 0);
		});
	}
	
	// Get x coordinate of cell
	getX(c) {
		let x = 0;
		for (let i = 0; i < c; i++)
			x += this.cols[i];
		return x + this.xoff;
	}
	
	// Get y coordinate of cell
	getY(r) {
		let y = 0;
		for (let i = 0; i < r; i++)
			y += this.rows[i];
		return y + this.yoff;
	}
	
	// Get cell from coordinates
	cellAt(x, y) {
		let c = 0, r = 0;
		let cs = this.xoff, rs = this.yoff;
		while (cs < x && c < this.cols.length) {
			cs += this.cols[c];
			c++;
		}
		while (rs < y && r < this.rows.length) {
			rs += this.rows[r];
			r++;
		}
		return this.cells[(c < 1 ? 0 : c - 1)][(r < 1 ? 0 : r - 1)];
	}
	
	update(mouse, key) {
		// Clear selection when escape is clicked
		if (key["Escape"]) {
			this.selectionStart = null;
			this.forEachCell(cell => cell.selected = cell.selected2 = false);
		}
		
		// Start selection on hovered cell on click
		if (mouse.click === 1 && !this.prevClick) {
			this.selectionStart = this.cellAt(mouse.x, mouse.y);
			
			this.selection2 = key["Control"];
			this.prevClick = true;
		}
		// Select cells while clicking
		if (mouse.click === 1 && this.prevClick) {
			if (this.selectionStart != null) {
				let prop = (this.selection2 ? "selected2" : "selected");
				this.forEachCell(cell => cell[prop] = false);
				this.forEachCellIn(this.selectionStart, this.cellAt(mouse.x, mouse.y), (cell) => cell[prop] = true);
			}
		}
		if (mouse.click === 0 && this.prevClick) {
			if (this.selection2 && this.selectionStart != null)
				this.forEachCellIn(this.selectionStart, this.cellAt(mouse.x, mouse.y), (cell) => {
					cell.selected = !cell.selected;
					cell.selected2 = false;
				});
			
			this.prevClick = false;
		}
	}
}

Table.asCol = function(str) {
	str = str.toUpperCase();
	let val = 0;
	for (let char of str)
		val = val * 26 + char.charCodeAt(0) - 64;
	return val - 1;
};