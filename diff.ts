import path from "path";
import chalk from "chalk";
import {
    fetchGrootPath,
    getHeadCommit,
    readFileTryCatch,
    type commitStructure,
    type move,
    type node,
} from "../utils";

export function diff(filePath: string) {
    const completeFilePath = path.resolve(filePath);
    console.log(`completeFilePath : ${completeFilePath}`);

    const oldFileContent: string[] = getOldFileContent(completeFilePath);
    const newFileContent: string[] = getNewFileContent(completeFilePath);

    const resultNode: move[] = myersDiffAlgorithm(
        oldFileContent,
        newFileContent,
    );
    printResult(resultNode);
}

function myersDiffAlgorithm(
    oldFileContent: string[],
    newFileContent: string[],
): move[] {
    const m: number = oldFileContent.length;
    const n: number = newFileContent.length;
    const totalSize: number = 2 * (m + n) + 1;
    const offSet: number = m + n;
    const V: Int32Array = new Int32Array(totalSize).fill(-1);
    const goal_k: number = m - n;

    // snapshots Int32Array
    const snapShots: Int32Array[] = [];
    let finalNode: node = { row: 0, col: 0 };
    // the number of edits being used so far.

    for (let d: number = 0; d <= m + n; d++) {
        // Save the previous V state before updating
        const prevV: Int32Array = new Int32Array(V);
        for (let k: number = -d; k <= d; k += 2) {
            const idx = k + offSet;

            const right = prevV[idx - 1]!;
            const down = prevV[idx + 1]! + 1;

            V[idx] = Math.max(right, down);
            const row = V[idx]!;
            const col = row - k;

            const position: node = { row, col };

            finalNode = greedyConsumeDiagonals(
                position,
                oldFileContent,
                newFileContent,
            );

            V[idx] = finalNode.row;

            if (k === goal_k && V[idx] === m) {
                snapShots.push(new Int32Array(V));
                finalNode = { row: m, col: n };
                return construction(
                    finalNode,
                    snapShots,
                    oldFileContent,
                    newFileContent,
                );
            }
        }
        // storing snapshots!
        snapShots.push(new Int32Array(V));
    }
    throw new Error("Myers diff failed — no path found");
}

function greedyConsumeDiagonals(
    position: node,
    oldFiles: string[],
    newFiles: string[],
): node {
    let row: number = position.row;
    let col: number = position.col;
    while (
        row < oldFiles.length &&
        col < newFiles.length &&
        oldFiles[row] === newFiles[col]
    ) {
        row += 1;
        col += 1;
    }
    if (row > oldFiles.length) row = oldFiles.length;
    if (col > newFiles.length) col = newFiles.length;
    return { row, col };
}

function construction(
    finalNode: node,
    snapshot: Int32Array[],
    oldFileContent: string[],
    newFileContent: string[],
): move[] {
    const moves: move[] = [];
    const m = oldFileContent.length;
    const n = newFileContent.length;
    const offSet = m + n;

    let x = finalNode.row - 1;
    let y = finalNode.col - 1;

    for (let d = snapshot.length - 1; d >= 1; d--) {
        const V = snapshot[d - 1]!;

        while (x >= 0 && y >= 0 && oldFileContent[x] === newFileContent[y]) {
            moves.push({ line: oldFileContent[x]!, moveType: "unchanged" });
            x -= 1;
            y -= 1;
        }
        let k: number = x - y;
        let left: number = V[k + 1 + offSet]!;
        let up: number = V[k - 1 + offSet]!;

        if (x >= 0) {
            if (up > left) {
                moves.push({ line: oldFileContent[x]!, moveType: "delete" });
                x -= 1;
            }
        }
        if (y >= 0) {
            if (left > up) {
                moves.push({ line: newFileContent[y]!, moveType: "add" });
                y -= 1;
            }
        }
    }
    while (x >= 0 && y >= 0 && oldFileContent[x] === newFileContent[y]) {
        moves.push({ line: oldFileContent[x]!, moveType: "unchanged" });
        x -= 1;
        y -= 1;
    }
    return moves.reverse();
}

function getOldFileContent(completeFilePath: string): string[] {
    let grootDirPath: string = path.join(fetchGrootPath(), ".groot");
    let headCommit: commitStructure = getHeadCommit();
    let oldFileHash: string | undefined = headCommit.snapshot[completeFilePath];
    if (!oldFileHash) {
        console.log(`file was never committed before: ${completeFilePath}`);
        process.exit(0);
    }
    let fileContent: string[] = readFileTryCatch(
        path.join(grootDirPath, "objects", `${oldFileHash}`),
    ).split("\n");

    if (fileContent[fileContent.length - 1] === "") {
        fileContent = fileContent.slice(0, -1);
    }
    return fileContent;
}

function getNewFileContent(completeFilePath: string): string[] {
    let fileContent: string[] = readFileTryCatch(completeFilePath).split("\n");
    if (fileContent[fileContent.length - 1] === "") {
        fileContent = fileContent.slice(0, -1);
    }
    return fileContent;
}

function printResult(result: move[]) {
    let output = "";
    for (let move of result) {
        if (move.moveType === "unchanged") {
            output += ` ${move.line}\n`;
        } else if (move.moveType === "delete") {
            output += chalk.red(`- ${move.line}\n`);
        } else if (move.moveType === "add") {
            output += chalk.green(`+ ${move.line}\n`);
        }
    }

    console.log("\n" + output);
}