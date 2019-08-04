const
	fs = require('fs'),
	fsp = fs.promises,
	path = require('path');

const dir = process.argv[2] || __dirname;

(function recurseDirs(dir) {
	for (let entry of fs.readdirSync(dir, {withFileTypes: true})) {
		if (entry.isDirectory()) {
			recurseDirs(path.join(dir, entry.name))
		} else if (entry.name.endsWith('.js')){
			fsp.readFile(path.join(dir, entry.name), 'utf8')
				.then(code => {
					let
						exportDefault = code.match(/export\s+default\s+(?<module>[^;\s]+)/),
						rewrite = false;

					if (exportDefault) {
						code = code.replace(exportDefault[0], 'module.exports = ' + exportDefault.groups.module);
						rewrite = true;
					}

					let subRe = String.raw`export .+?[;\n]`
					//let namedExports = code.match(/(?<=[;\}]\s*)(export .+?[;\n])|^export .+?[;\n]/g);
					let namedExports = code.match(RegExp(String.raw`(?<=[;\}]\s*)(${subRe})|^${subRe}`, 'g'))
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
						console.log(entry.name);
						fsp.writeFile(path.join(dir, entry.name), code);
					}
				});
		}
	}
})(dir);
