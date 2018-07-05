// import pkg from "./package.json";

export default [
	{
		input: "src/index.js",
		output: {
			name: "Filer",
			file: "dist/filer.js",
			format: "umd",
			sourcemap: "inline",
		},
	},
];
