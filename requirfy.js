const
	fs = require('fs'),
	fsp = fs.promises,
	path = require('path');

const dir = process.argv[2];

function getExtension(fileName) {
	let match = fileName.match(/\..+$/)
	return match ? match[0] : '';
}

(function recurseDirs(dir) {
	for (let child of fs.readdirSync(dir, {withFileTypes: true})) {
		if (child.isDirectory()) {
			recurseDirs(path.join(dir, child.name))
		} else if (getExtension(child.name) == '.js'){
			fsp.readFile(path.join(dir, child.name), 'utf8')
				.then(code => {
					let
						exportDefault = code.match(/export\s+default\s+(?<module>[^;\s]+)/),
						rewrite = false;

					if (exportDefault) {
						code = code.replace(exportDefault[0], 'module.exports = ' + exportDefault.groups.module);
						rewrite = true;
					}

					let namedExports = code.match(/export .+?[;\n]/g);
					if (namedExports) {
						for (let nExp of namedExports) {
							code = code.replace(nExp, '');
						}

						rewrite = true;
					}

					for (let import_ of code.matchAll(/import\s+(?<name>[\S]+)\s+from\s+['"](?<path>.+?)['"]/g)) {
						if (import_) {
							let {name, path} = import_.groups;
							code = code.replace(import_[0], `const ${name} = require('${path}')`);
							rewrite = true;
						}
					}

					if (rewrite) {
						console.log(child.name);
						fsp.writeFile(path.join(dir, child.name), code);
					}
				});
		}
	}
})(dir);
