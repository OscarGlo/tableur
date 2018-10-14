const wsp = " \t\n\r",
	pars = "(){}[]",
	ope = ["+", "-", "*", "/", "%", "^", ">", "<", ">=", "<=", "==", "!=", "&&", "||"];

function EvalException(str) {
	this.message = str;
	this.name = "EvalException";
	this.toString = () => this.name + ": " + this.message;
}

// Find matching parenthesis in a string
String.prototype.matchPar = function(ind) {
	let matches = ["()", "{}", "[]"];
	let chars = [];
	
	for (let i = ind; i < this.length; i++) {
		if (pars.includes(this.charAt(i))) {
			chars.push(this.charAt(i));
			
			while (matches.includes(chars[chars.length - 2] + chars[chars.length - 1]))
				chars = chars.splice(0, chars.length - 2);
			
			if (chars.length === 0)
				return i;
		}
	}
};

String.prototype.isNum = function() {
	return this.match(/([0-9]+)|([0-9]*\.[0-9]*)/);
};

String.prototype.isAlpha = function() {
	return this.match(/[a-z]+/i);
};

// Test in two arrays have one common element
Array.prototype.hasCommonElem = function(arr) {
	for (let elem of arr)
		if (this.includes(elem))
			return true;
	return false;
};

// Get the index of the biggest element in an array
Array.prototype.maxIndex = function() {
	let maxI = -1;
	
	for (let i = 0; i < this.length; i++)
		if (maxI === -1 || this[i] > this[maxI])
			maxI = i;
	
	return maxI;
};

// Get ith element of all subarrays in an array
Array.prototype.getEach = function(i) {
	let arr = [];
	this.forEach(subArr => arr.push(subArr[i]));
	return arr;
};

// Execute one or multiple binary operations (from left to right)
Array.prototype.binOpe = function(ope, fun) {
	if (!Array.isArray(ope))
		while (this.includes(ope)) {
			let i = this.indexOf(ope);
			if (this[i - 1] != null && this[i + 1] != null)
				this.splice(i - 1, 3, fun(Number(this[i - 1]), Number(this[i + 1])));
			else
				throw new EvalException(`Missing operand around operator ${ope}`);
		}
	else
		while (this.hasCommonElem(ope.getEach(0))) {
			let indexes = [];
			ope.forEach(op => indexes.push(this.indexOf(op[0])));
			let j = indexes.maxIndex();
			let i = this.indexOf(ope[j][0]);
			if (this[i - 1] != null && this[i + 1] != null)
				this.splice(i - 1, 3, ope[j][1](Number(this[i - 1]), Number(this[i + 1])));
			else
				throw new EvalException(`Missing operand around operator ${ope[j][0]}`);
		}
};

const constants = {
	"pi": Math.PI,
	"e": Math.E,
	"phi": 1.6180339887
};

const functions = {
	"sum": (...args) => args.reduce((s, a) => s + a, 0),
	"product": (...args) => args.reduce((s, a) => s * a, 0),
	"min": (...args) => Math.min(...args),
	"max": (...args) => Math.max(...args),
	"avg": (...args) => functions.sum(...args) / args.length,
	"sqrt": (x) => Math.sqrt(x),
	"nroot": (n, x) => Math.pow(x, 1/n)
};

function executeFun(name, args) {
	for (let i = 0; i < args.length; i++)
		args[i] = evalExpr(args[i]);
	
	if (functions[name] == null)
		throw new EvalException(`Unknown function ${name}`);
	
	return functions[name](...args);
}

function evalExpr(str) {
	let stack = [];
	
	let last = "opewsp";
	
	// Build stack
	for (let i = 0; i < str.length; i++) {
		let char = str[i];
		
		if (!wsp.includes(char)) {
			if (char.isAlpha()) { // If a letter is found
				if (last === "let") {
					stack[stack.length - 1] += char;
				} else if (last.includes("ope")) {
					stack.push(char);
				}
				last = "let";
				
				
			} else if (char === "(") { // If an opening parethesis is found
				let match = str.matchPar(i);
				let content = str.substring(i + 1, match);
				if (last.includes("let")) { // Execute function with parameters
					stack.push(executeFun(stack.pop(), content.split(/\s*,\s*/)));
				} else { // Treat subexpression recursively
					stack.push(evalExpr(content));
				}
				
				i = match;
				last = "numwsp";
				
				
			} else if (char.isNum()) { // If a number element is found
				if (last === "num")
					if (stack[stack.length - 1].includes(".") && char === ".")
						throw new EvalException(`Multiple decimal points at character ${i}`);
					else
						stack[stack.length - 1] += char; // Append to previous number
				else if (last.includes("ope"))
					stack.push(char); // Add number after operation
				else
					throw new EvalException(`Misplaced number at character ${i}`);
				last = "num";
				
				
			} else if (ope.join().includes(char)) { // Else if operation character is found
				if ((last.includes("num") || last.includes("let")) && ope.getEach(0).includes(char))
					stack.push(char); // Add it if no operation before
				else if (last === "ope" && ope.getEach(1).includes(char)) { // Test for 2nd character of a 2 character operator
					let newop = stack.pop() + char;
					if (ope.includes(newop))
						stack.push(newop);
					else
						throw new EvalException(`Unknown operator ${newop} at character ${i}`);
				} else
					throw new EvalException(`Misplaced operator at character ${i}`);
				last = "ope";
				
				
			} else
				throw new EvalException(`Unknown character ${char} at character ${i}`);
		} else { // If a whitespace is found
			if (["num", "ope", "let"].includes(last))
				last += "wsp";
		}
	}
	
	// Replacements
	stack.forEach((elem, i) => {
		if (elem === ".") stack[i] = 0; // Dots as 0s
		else if (typeof elem === "string" && elem.isAlpha()) { // Replace constant names
			if (constants[elem] != null)
				stack[i] = constants[elem];
			else
				throw new EvalException(`Unknown constant ${elem}`);
		}
	});
	
	// Execute operations in order
	stack.binOpe("^", (a, b) => Math.pow(a, b));
	stack.binOpe([
		["*", (a, b) => a * b],
		["/", (a, b) => a / b],
		["%", (a, b) => a % b]
	]);
	stack.binOpe([
		["+", (a, b) => a + b],
		["-", (a, b) => a - b]
	]);
	stack.binOpe([
		[">", (a, b) => a > b],
		["<", (a, b) => a < b],
		[">=", (a, b) => a >= b],
		["<=", (a, b) => a <= b]
	]);
	stack.binOpe([
		["==", (a, b) => a == b],
		["!=", (a, b) => a != b]
	]);
	stack.binOpe([
		["&&", (a, b) => a && b],
		["||", (a, b) => a || b]
	]);
	
	return Number(stack.pop());
}