class X
{
	constructor(a, b)
	{
		this.a = a;
		this.b = b;
	}

	valueOf()
	{
		return `${a}${b}`;
	}
}

let obj1 = new X(1, 2);
let obj2 = new X(1, 2);
let obj3 = new X(2, 3);

console.log(obj1 === obj2);