async function runPython() {
	const pythonCmd = 'python';
	const scriptPath = 'resources/python/HelloWorld.py';
	try {
		let result = await Neutralino.os.execCommand(`${pythonCmd} ${scriptPath}`);
		document.getElementById('output').textContent = result.stdOut || result.stdErr;
	} catch (err0r) {
		document.getElementById('output').textContent = 'Error running Python: ' + error.message;
	}
}