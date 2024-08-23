import fs from 'fs';
import csvParser from 'csv-parser';

type CSVRow = Record<string, string>;

async function parseCSV(filePath: string): Promise<CSVRow[]> {
    return new Promise((resolve, reject) => {
        const results: CSVRow[] = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

export async function compareCSVFiles(file1: string, file2: string): Promise<number> {
    try {
        const [data1, data2] = await Promise.all([parseCSV(file1), parseCSV(file2)]);

        if (data1.length !== data2.length) {
            throw new Error('CSV files have different number of rows.');
        }

        for (let i = 0; i < data1.length; i++) {
            const row1 = data1[i];
            const row2 = data2[i];

            const keys1 = Object.keys(row1);
            const keys2 = Object.keys(row2);

            if (keys1.length !== keys2.length) {
                throw new Error(`Row ${i + 1} has different number of columns.`);
            }

            for (const key of keys1) {
                if (row1[key] !== row2[key]) {
                    throw new Error(`Mismatch found in row ${i + 1}, column ${key}. Value in file1: ${row1[key]}, value in file2: ${row2[key]}.`);
                }
            }
        }

        console.log('CSV files match!');
        return 0;
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

