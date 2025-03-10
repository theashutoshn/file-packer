const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    // Register command
    const disposable = vscode.commands.registerCommand(
        'file-packer.exportFiles',
        async function (uri) {
            try {
                // If the user right-clicked a folder, 'uri' should contain that folder's path.
                // If no folder was specifically selected, default to the first workspace folder.
                const folderPath = (uri && uri.fsPath) || (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath);

                if (!folderPath) {
                    vscode.window.showErrorMessage('No folder selected and no workspace open.');
                    return;
                }

                // Define important file extensions and directories to ignore.
                const importantExtensions = ['.js', '.ts', '.cs', '.html', '.css', '.hpp', '.cpp', '.txt', '.py'];
                const ignoreDirs = ['node_modules', '.git'];

                // Recursively gather file paths.
                let collectedFiles = [];
                gatherFilesRecursively(folderPath, importantExtensions, ignoreDirs, collectedFiles);

                // Compile them into a single text file.
                const combinedContent = compileFilesIntoOne(collectedFiles);

                // Prompt user for the output location.
                const targetFileName = 'compiled_files.txt';
                const targetUri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(path.join(folderPath, targetFileName)),
                    saveLabel: 'Save Compiled File',
                    filters: {
                        'Text Files': ['txt']
                    }
                });

                if (!targetUri) {
                    // User canceled saving.
                    return;
                }

                // If user didn't manually add an extension, force .txt.
                let finalPath = targetUri.fsPath;
                if (!finalPath.toLowerCase().endsWith('.txt')) {
                    finalPath += '.txt';
                }

                // Write the combined content to that file.
                fs.writeFileSync(finalPath, combinedContent, 'utf-8');

                // Show success message.
                vscode.window.showInformationMessage('Files successfully compiled and saved!');
            } catch (error) {
                vscode.window.showErrorMessage(`Error compiling files: ${error.message}`);
            }
        }
    );

    context.subscriptions.push(disposable);
}

// Utility function to walk the folder tree.
function gatherFilesRecursively(dirPath, importantExtensions, ignoreDirs, collected) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Skip ignored directories.
        if (entry.isDirectory() && ignoreDirs.includes(entry.name)) {
            continue;
        }

        if (entry.isDirectory()) {
            // Recurse into subdirectories.
            gatherFilesRecursively(fullPath, importantExtensions, ignoreDirs, collected);
        } else {
            // Check if the file extension is in importantExtensions.
            const ext = path.extname(entry.name).toLowerCase();
            if (importantExtensions.includes(ext)) {
                collected.push(fullPath);
            }
        }
    }
}

// Utility function to read and combine file contents.
function compileFilesIntoOne(files) {
    let result = '';
    files.forEach(function (filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Optional: add a separator or file marker.
            result += `\n/***** FILE: ${filePath} *****/\n${content}\n`;
        } catch (e) {
            console.error(`Could not read file ${filePath}: ${e}`);
        }
    });
    return result;
}

function deactivate() {
    // Clean up if necessary.
}

module.exports = {
    activate,
    deactivate
};
