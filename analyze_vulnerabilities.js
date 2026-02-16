import { execSync } from 'child_process';

const LOCAL_PACKAGES = ['eecircuit-schematic', 'webgl-plot', 'svg-to-pdf', 'eecircuit-engine', 'eecircuit'];

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    } catch (e) {
        return e.stdout;
    }
}

function analyze() {
    console.log('Running npm audit --json...');
    const auditJson = runCommand('npm audit --json');
    let auditData;
    try {
        auditData = JSON.parse(auditJson);
    } catch (e) {
        console.error('Failed to parse npm audit output');
        return;
    }

    const vulns = auditData.vulnerabilities || {};
    let count = 0;

    console.log('\n=== Vulnerability Trace ===\n');

    for (const [name, info] of Object.entries(vulns)) {
        if (info.severity !== 'high' && info.severity !== 'critical') continue;

        console.log(`🔍 Analyzing ${name} (${info.severity})...`);
        const whyOutput = runCommand(`npm why ${name}`);
        
        const culprits = new Set();
        LOCAL_PACKAGES.forEach(pkg => {
            if (whyOutput.includes(pkg)) {
                culprits.add(pkg);
            }
        });

        if (whyOutput.includes('the root project')) {
            culprits.add('eecircuit');
        }

        if (culprits.size > 0) {
            console.log(`   ⚠️  Found link to local packages: ${Array.from(culprits).join(', ')}`);
            // Try to extract specific line showing the relationship
            const lines = whyOutput.split('\n');
            lines.forEach(line => {
                if (LOCAL_PACKAGES.some(pkg => line.includes(pkg)) || line.includes('the root project')) {
                   console.log(`      -> ${line.trim()}`);
                }
            });
            count++;
        } else {
            console.log(`   ⚪️  No obvious link to local packages.`);
        }
        console.log('---');
    }

    console.log(`\nFound ${count} high/critical vulnerabilities linked to local packages.`);
}

analyze();
