import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

  // Register command
  const disposable = vscode.commands.registerCommand(
    'file-packer.exportFiles',
    async (uri: vscode.Uri) => {
      try {
        // If the user right-clicked a folder, 'uri' should contain that folder's path.
        // If no folder was specifically selected, we might default to the workspace root.
        const folderPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0].uri.fsPath;

        if (!folderPath) {
          vscode.window.showErrorMessage('No folder selected and no workspace open.');
          return;
        }

        // 1) Decide how you define "important files":
        //    - maybe .js, .ts, .cs, or .html, .css, etc.
        //    - or based on your custom logic
        const importantExtensions = ['.js', '.ts', '.cs', '.html', '.css', '.hpp', '.cpp', '.txt', '.py'];
        const ignoreDirs = ['node_modules', '.git'];

        // 2) Recursively gather file paths
        let collectedFiles: string[] = [];
        gatherFilesRecursively(folderPath, importantExtensions, ignoreDirs, collectedFiles);

        // 3) Compile them into a single text file (or you can create a ZIP, etc.)
        const combinedContent = compileFilesIntoOne(collectedFiles);

        // 4) Prompt user for the output location or decide automatically
        const targetFileName = 'compiled_files.txt';
        const targetUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(path.join(folderPath, targetFileName)),
          saveLabel: 'Save Compiled File',
          filters: {
            'Text Files': ['txt']
          }
        });

        if (!targetUri) {
          // user canceled saving
          return;
        }

        // If user didn't manually add an extension, force .txt
        let finalPath = targetUri.fsPath;
        if (!finalPath.toLowerCase().endsWith('.txt')) {
          finalPath += '.txt';
        }

        // 5) Write the combined content to that file
        fs.writeFileSync(finalPath, combinedContent, 'utf-8');

        // 6) Show success message
        vscode.window.showInformationMessage('Files successfully compiled and saved!');

      } catch (error: any) {
        vscode.window.showErrorMessage(`Error compiling files: ${error.message}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

// Utility function to walk the folder tree
function gatherFilesRecursively(
  dirPath: string,
  importantExtensions: string[],
  ignoreDirs: string[],
  collected: string[]
) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    // Skip ignored directories
    if (entry.isDirectory() && ignoreDirs.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      gatherFilesRecursively(fullPath, importantExtensions, ignoreDirs, collected);
    } else {
      // Check if the file extension is in importantExtensions
      const ext = path.extname(entry.name).toLowerCase();
      if (importantExtensions.includes(ext)) {
        collected.push(fullPath);
      }
    }
  }
}

// Utility function to read and combine file contents
function compileFilesIntoOne(files: string[]): string {
  let result = '';

  files.forEach((filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Optional: add some separators or file markers
      result += `\n/***** FILE: ${filePath} *****/\n${content}\n`;
    } catch (e) {
      console.error(`Could not read file ${filePath}: ${e}`);
    }
  });

  return result;
}

export function deactivate() {
  // Clean up if necessary
}
