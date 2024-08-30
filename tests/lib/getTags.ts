import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';

export async function cloneAndGetLatestTag(repoUrl: string, localDir: string): Promise<string | null> {
    const git: SimpleGit = simpleGit();
    const repoName = path.basename(repoUrl, '.git');
    const fullLocalPath = path.join(localDir, repoName);

    try {
        // Check if the directory already exists
        await fs.access(fullLocalPath);
        console.log(`Directory ${fullLocalPath} already exists. Using existing directory.`);
    } catch {
        // If the directory does not exist, clone the repo
        console.log(`Cloning ${repoUrl} into ${fullLocalPath}...`);
        await git.clone(repoUrl, fullLocalPath);
    }

    const repoGit = simpleGit(fullLocalPath);

    try {
        // Get the latest tag using `git describe --tags`
        const latestTag = await repoGit.raw(['describe', '--tags']);
        console.log(`The latest tag is: ${latestTag.trim()}`);
        return latestTag.trim();
    } catch (error) {
        console.error('Error while getting the latest tag:', error);
        return null;
    }
}

