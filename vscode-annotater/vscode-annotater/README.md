# vscode-annotater README

Annotation extension for Visual Studio Code. This extension is primarily exploring the art of the possible for data annotation with a VS Code extension.

## Installation

To install this extension in VS Code, go to ```View -> Command Palette``` and type ```Extensions: Install from VSIX...```. Then select the .vsix file in this directory and reload. The extension will be installed.

## Use

This extension has a few preferences that need to be set up to work correctly. First, choose whether or not you would like to use elastic search in ```Preferences -> Settings -> Extensions -> VSCodeAnnotater -> elasticsearch -> enable```

If elasticsearch is enabled, you must fill in a valid elastic search address at ```Preferences -> Settings -> Extensions -> VSCodeAnnotater -> elasticsearch -> address```

If elasticsearch is disabled, please choose a valid directory on your local file system for the value at ```Preferences -> Settings -> Extensions -> VSCodeAnnotater -> data -> folder```. All of your annotations will be saved to ```.json``` files in that directory.

## Features

+ Submission of selected text to an elastic search endpoint. ("Annotate" command)
+ Submission of selected text to an arbitrary HTTP endpoint.
+ Proof of concept annotation form for selected annotation.
+ Proof of concept for submitting the entire contents of a file to an endpoint. ("Upload file" command)
+ Proof of concept for Gromet syntax highlighting ("Gromet Sample" command)
+ Save Annotations to local JSON files or to an elasticsearch endpoint.

## Requirements

None yet

## Known Issues

Development bugs, not a final product.

## Release Notes

10/31/2022 - Update contains capability to save annotations locally or to elastic search. Update also contains functional annotation form for TA1.

10/04/2022 - Newest update has Gromet syntax highlight proof of concept and packaging support.

9/27/2022 - Newest update has proof of concept for annotation webview form.
