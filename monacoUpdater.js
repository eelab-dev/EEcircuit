const fs = require('fs').promises;
const path = require('path');

async function updateMonacoVersion() {
    try {
        // Paths to the package.json and monacoLoader.ts files
        const packageFilePath = path.join(__dirname, 'package.json'); // Adjust the path as necessary
        const monacoLoaderPath = path.join(__dirname, 'src', 'editor', 'monacoLoader.ts');

        // Read package.json and extract Monaco Editor's version
        const packageJson = JSON.parse(await fs.readFile(packageFilePath, 'utf8'));
        const monacoVersion = packageJson.dependencies['monaco-editor'] || packageJson.devDependencies['monaco-editor'];
        if (!monacoVersion) {
            console.error('Monaco Editor is not listed as a dependency in package.json');
            return;
        }

        // Remove caret or similar characters like tilde (~) from the version number
        const cleanVersion = monacoVersion.replace(/^[^0-9]+/, '');

        // Read the existing monacoLoader.ts file
        let monacoLoaderContent = await fs.readFile(monacoLoaderPath, 'utf8');

        // Replace the version in the monacoPath
        monacoLoaderContent = monacoLoaderContent.replace(/monaco-editor@[\d\.]+/g, `monaco-editor@${cleanVersion}`);

        // Write the updated content back to the monacoLoader.ts file
        await fs.writeFile(monacoLoaderPath, monacoLoaderContent, 'utf8');
        console.log(`Updated Monaco Editor version to ${cleanVersion} in monacoLoader.ts`);
    } catch (error) {
        console.error('Failed to update Monaco Editor version:', error);
    }
}

updateMonacoVersion();
