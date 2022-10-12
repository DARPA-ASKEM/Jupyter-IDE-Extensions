// @ts-nocheck

// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');
const path = require('path');
const fetch = require('node-fetch');
const { constants } = require('buffer');
const { waitForDebugger } = require('inspector');
const config = vscode.workspace.getConfiguration('vscodeAnnotater');

console.log(config.get("elasticsearch.address"));


// Get data from elasticsearch endpoint
async function getFromES(id) {

	const url = config.get("elasticsearch.address") + 'vscode_annotations/_doc/' + id + '?pretty';

	const response = await fetch(url)
		.then(response => response.json());
	const responseValue = response;
	const responseSource = responseValue._source;
	console.log("RESPONSE SOURCE: ", responseSource);
	return await responseSource;

}


// Push to elasticsearch endpoint.
function pushToES(id, annotation) {

	//REQUEST TO ELASTICSEARCH

	const body = JSON.stringify({ "annotations": annotation });
	const url = config.get("elasticsearch.address") + 'vscode_annotations/_doc/' + id + '?pretty';

	console.log("FULL URL: ", url);

	const response = fetch(url, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: body
	});

	console.log("Push response: ", response);

}

// Post to arbitrary URL
async function postToURL(url, body) {
	const response = fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: body
	}).then(response => response.json());
	console.log("POST RESPONSE: ", await response);
	return await response;
}


// Decorate lines function to apply annotation decorators after annnotation submission.
function decorateLines(editor, range, annotation) {
	console.log("Decorating lines. Range: ", range);
	let rangeline = range.start.line;
	const decorationType = vscode.window.createTextEditorDecorationType({
		after: {
			backgroundColor: '#4e4e4e',
			contentText: "Annotation: " + JSON.stringify(annotation[rangeline].userInput),
			margin: "0px 10px",
			width: '1000px',
			height: '25px'
		},

	});

	editor.setDecorations(decorationType, [range]);
}

// Function to decorate syntax for GROMET, the two decoration functions could be combined into one eventually.
function decorateSyntax(editor, rangeValue, hoverDecorator) {

	console.log("Decorating gromet syntax");

	const decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor: '#1e281e',
		isWholeLine: true
	});

	const markdown = JSON.stringify(hoverDecorator);

	editor.setDecorations(decorationType, [{
		range: rangeValue,
		hoverMessage: markdown
	}]);
}

// Loads previous annotations from the elasticsearch endpoint and decorates them into the editor.
async function loadPreviousAnnotations() {
	const editor = vscode.window.activeTextEditor;
	if (typeof editor === 'undefined') { //Fixes rejected promise error
		return;
	}
	const id = editor.document.fileName.split('/').pop();
	console.log("Document ID:", id);

	const annotationsResponse = await getFromES(id);
	const annotations = annotationsResponse["annotations"];

	console.log(annotations, "type of: ", typeof (annotations));

	for (let annotationKey in annotations) {
		let annotation = annotations[annotationKey];
		console.log(annotation, "Range: ", annotation.range);
		let range = new vscode.Range(annotation.range[0], annotation.range[1]);
		decorateLines(editor, range, annotations);
	}

}


// Deprecated
async function runInputForm() {
	const pickResult = await vscode.window.showQuickPick(['variable', 'function', 'lambda'], {
		placeHolder: 'Choose type of annotation',
		onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${item}`)
	});
	const comment = await vscode.window.showInputBox({
		prompt: "Comment for your annotation:",
		placeHolder: "Comment",
	});

	const userInput = {
		"type": pickResult,
		"comment": comment
	};

	return userInput;

}

async function runWebviewForm(context) {
	// Create and show a new webview
	const panel = vscode.window.createWebviewPanel(
		'annotation', // Identifies the type of the webview. Used internally
		'Annotation', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{
			enableScripts: true,
			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'resources'))]
		}
	);

	console.log("CONTEXT EXTENSION PATH: ", context.extensionPath);
	const bootstrapOnDisk = vscode.Uri.file(
		path.join(context.extensionPath, 'resources', 'css', 'bootstrap.css')
	);
	const bootstrap = panel.webview.asWebviewUri(bootstrapOnDisk);
	console.log("BOOTSTRAP URI: ", bootstrap);

	// And set its HTML content
	panel.webview.html = getWebviewContent(bootstrap);

	// Handle messages from the webview
	let userInput;
	return new Promise((resolve) => {
		panel.webview.onDidReceiveMessage(
			message => {
				console.log("Recieved message from webview form.");
				resolve(message);
				return message;
			},
			undefined,
			context.subscriptions
		);

		return userInput;
	}).then((result) => {
		// do something with result (message) in here
		return result
	});
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Loads previous annotations upon activation.
	console.log("Loading previous annotations.");
	loadPreviousAnnotations();

	// Registers command for opening arbitrary URL on 
	let HTTPOpenDisposable = vscode.commands.registerCommand('vscode-annotater.openBrowser', function () {
		vscode.env.openExternal(vscode.Uri.parse('https://jataware.com'));
	});

	//NOT FUNCTIONAL, NEED FURTHER REQUIREMENTS FROM UAZ? STUB
	let sendSelectionToEndpoint = vscode.commands.registerCommand('vscode-annotater.sendSelection', async function () {
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		//TODO send selection to endpoint
		const body = JSON.stringify({ "code": selectedText });
		const response = await postToURL("https://uaz.url.edu", body);

		//TODO Replace text with returned API endpoint code
	});

	// Registers command to annotate a text selection.
	let disposable = vscode.commands.registerCommand('vscode-annotater.annotate', async function () {
		const editor = vscode.window.activeTextEditor;
		if (typeof editor === 'undefined') {
			return;
		}
		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		const id = editor.document.fileName.split('/').pop();
		const line = editor.selection.start.line;

		// Grab the selection range to store in annotation.
		let range = new vscode.Range(
			selection.start,
			selection.end
		);

		console.log(selection);

		let esResponse = await getFromES(id);
		console.log(esResponse);

		// Instantiate annotation object to assign previous values if they exist in the ES.
		let annotation;

		try { annotation = esResponse.annotations; }
		catch (error) {
			annotation = {};
		}

		const userInput = await runWebviewForm(context);

		if (typeof userInput === 'undefined') {
			return false;
		}
		else {
			//let annotation = {};
			annotation[line] = {
				"text": selectedText,
				"range": range,
				"userInput": userInput
			}

			pushToES(id, annotation);
			console.log("ANNOTATION: ", annotation);

			decorateLines(editor, range, annotation);
		}

	});

	// Registers a command to reload annotations manually.
	let reload = vscode.commands.registerCommand("vscode-annotater.reload", async function () {
		loadPreviousAnnotations();
	});

	let entireFileUpload = vscode.commands.registerCommand("vscode-annotater.uploadFile", async function () {
		await vscode.commands.executeCommand('copyFilePath');
		let folder_file = await vscode.env.clipboard.readText();
		console.log("File: ", folder_file);
		let uri = "file://" + folder_file
		console.log("URI: ", uri);
		vscode.workspace.openTextDocument(folder_file).then((document) => {
			console.log("Document: ", document, "Line Count: ", document.lineCount);
		});

		vscode.commands.executeCommand("vscode-annotater.grometHighlight");
	});

	let grometHighlight = vscode.commands.registerCommand("vscode-annotater.grometHighlight", async function () {
		// SHOULD GRAB GROMET FILE FROM ENDPOINT
		// INSTEAD WILL LOAD FROM STATIC FILE FOR NOW
		const editor = vscode.window.activeTextEditor;
		const hardcodedGrometJSON = require("./hardcoded-files/CHIME_SIR--Gromet-FN-auto.json");

		console.log(hardcodedGrometJSON);

		const grometAttributesArray = hardcodedGrometJSON["attributes"];
		const grometMetadataArray = hardcodedGrometJSON["metadata_collection"]

		//console.log("Got both objects, attributes: ", grometAttributesArray, " metadata: ", grometMetadataArray);

		for (const element of grometAttributesArray) {
			console.log("inside of for loop: ", element);
			let valueArray = element.value.b;
			let valueMetadataArrayIndex;
			try {
				console.log("Getting metadata index");
				valueMetadataArrayIndex = valueArray[0]["metadata"]; // HARDCODED INDEX, potentially bad.
				let boolcheck = typeof valueMetadataArrayIndex === 'undefined';
				console.log("INDEX: ", valueMetadataArrayIndex, "BOOL: ", boolcheck);
				if (typeof valueMetadataArrayIndex === 'undefined') {
					throw "Undefined array index";
				}
			} catch (error) {
				console.log("skipping iteration");
				continue;
			}

			console.log("After try catch");
			let metaObjectArray = grometMetadataArray[valueMetadataArrayIndex - 1];
			if (typeof metaObjectArray === 'undefined') {
				continue;
			}
			let metaObject = metaObjectArray[0]; // HARDCODED INDEX, potentially bad.

			console.log("Creating range: ", metaObject);
			let range = new vscode.Range(
				new vscode.Position(
					metaObject.line_begin - 1,
					metaObject.col_begin
				),
				new vscode.Position(
					metaObject.line_end - 1,
					metaObject.col_end
				)
			);

			console.log("RANGE: ", range);

			let hoverDecorator = {
				"code_file_reference_uid": metaObject.code_file_reference_uid,
				"provenance": metaObject.provenance
			}

			decorateSyntax(editor, range, hoverDecorator);

		}
	});

	// Pushes an event listener for active text editor changing to reload annotations on it.
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
		loadPreviousAnnotations();
	}));

	// Pushes all disposable function calls to subscriptions.
	context.subscriptions.push(disposable);
	context.subscriptions.push(HTTPOpenDisposable);
	context.subscriptions.push(sendSelectionToEndpoint);
	context.subscriptions.push(reload);
	context.subscriptions.push(entireFileUpload);
	context.subscriptions.push(grometHighlight);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}



function getWebviewContent(bootstrap) {
	return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <link rel="stylesheet" type="text/css" href="${bootstrap}">
	  <title>Annotation</title>
  </head>
  <body>
	<h3>Annotating File or Selection</h3><br>
	<form id="annotateForm" onsubmit="formSubmit()">
		<div class="form-group">
			<input type="radio" id="predicate" name="annotation_type" value="predicate"  class="form-check-input">
			<label for="predicate" class="form-check-label">Predicate</label><br>
			<input type="radio" id="function" name="annotation_type" value="function" class="form-check-input">
			<label for="function" class="form-check-label">Function</label><br>
			<input type="radio" id="expression" name="annotation_type" value="expression" class="form-check-input">
			<label for="expression" class="form-check-label">Expression</label><br>
		</div>
		<div class="form-group">
			<label for="comment">Comment:</label><br>
			<input type="text" id="comment" name="comment" class="form-control"><br>
		</div>
		<input type="submit" value="Submit" class="btn btn-primary">
	</form>

	<script>
		function formSubmit() {
			const vscode = acquireVsCodeApi();
			const form = document.getElementById("annotateForm");

			vscode.postMessage(getData(form));
		}

		function getData(form) {
			var formData = new FormData(form);
		  
			for (var pair of formData.entries()) {
			  console.log(pair[0] + ": " + pair[1]);
			}
		  
			console.log(Object.fromEntries(formData));
			return Object.fromEntries(formData);
		  }
    </script>
  </body>
  </html>`;
}
