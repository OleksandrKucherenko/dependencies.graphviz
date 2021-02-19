#!/usr/bin/env node

'use strict';

const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const lineByLine = require('n-readlines');

/* Ref: https://github.com/yargs/yargs/blob/HEAD/docs/api.md */
const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 gradle_dependencies_log')
    .demand(1)
    .boolean('verbose')
    .alias('v', 'verbose')
    .describe('verbose', 'Publish debug information')
    .option("search", {alias: 's', default: 'com.fasterxml.jackson'})
    .boolean('dot')
    .alias('d', 'dot')
    .describe('dot', 'Print GraphViz dot graph instead')
    .boolean('simplify')
    .alias('i', 'simplify')
    .describe('simplify', 'Remove version information from dependencies')
    .help()
    .argv

// matchers, test via https://regex101.com/
const TREE_SYMBOLS = /^[| \-+\\]+/i;
const DEPENDENCY = /((Task|project) )?([a-z:0-9.\-]{12,}(\{[^}]+})?)/i;
const NO_VERSION = /:({strictly )?[0-9][0-9.\-a-z+]+}?/gi;

// Flags
const isVerbose = argv.verbose || false
const isDot = argv.dot || false
const isSimplified = argv.simplify || false
const source = argv._[0]
if (isVerbose) console.dir(argv)

let rawLine, position = 1, stack = [], prevLevel = 0;
const knownEdges = [];
const liner = new lineByLine(source);

// Helpers
let total = 0;
const dumpFoundLines = () => {
    console.log(`-(${++total})-------------------`);

    for (const node of stack) {
        console.log(`Line ${node.position}: ${node.line}`);
    }
}

const extractLineLevel = line => {
    const treeSymbols = TREE_SYMBOLS.exec(line);
    const offset = (treeSymbols || [{length: 0}])

    return offset[0].length;
};

const extractedDependencyInfo = line => {
    const simplified = line.match(DEPENDENCY) || [''];
    let dependency = simplified[0];

    /* remove version information in simplified mode */
    if (isSimplified) {
        dependency = dependency.replace(NO_VERSION, '');
    }

    return dependency;
};

const updateStack = (level, processedLine) => {
    /* accumulate stack of dependencies. */
    if (level === 0) { // reset to 0-zero level
        stack = [processedLine];
    } else if (level > prevLevel) { // increased
        stack.push(processedLine);
    } else if (level < prevLevel) { // decreased
        for (let i = level; i < prevLevel; i += 5) stack.pop();

        stack[stack.length - 1] = processedLine;
    } else { // same level
        stack[stack.length - 1] = processedLine;
    }
};

const projectNodes = [], taskNodes = [];
const styledNode = (node, projects, tasks) => {
    const isProject = node.dependency.includes('project ');
    const isTask = node.dependency.includes('Task ') ||
        node.dependency.includes('Classpath');

    if(isProject && !projects.includes(node)) projects.push(node)
    if(isTask && !tasks.includes(node)) tasks.push(node)
}

// MAIN: begin
if (isDot) {
    console.log('digraph G {');
    /* Adjust graph styles: https://graphviz.org/doc/info/attrs.html */
    console.log('    graph [pad="0.5", nodesep="1", ranksep="2"]; splines="false"; node[shape = rectangle];');
}

while (rawLine = liner.next()) {
    const line = rawLine.toString('utf-8');
    const isFound = line.includes(argv.search)
    const level = extractLineLevel(line);
    const dependency = extractedDependencyInfo(line);
    const processedLine = {position, line, dependency};

    updateStack(level, processedLine);

    if (isFound) {
        if (isDot) {
            let graph = '', comment = '';
            let delimiter = '    ', commentDelimiter = '';
            let prevNode = {dependency: ''};

            for (const node of stack) {
                /* in comment store not simplified path */
                comment += `${commentDelimiter}[${node.position}]`;
                commentDelimiter = ', ';

                /* if we have repeat of the edge on graph - skip it! */
                const edge = `"${prevNode.dependency}" -> "${node.dependency}"`
                const isUnKnownEdge = !knownEdges.includes(edge);

                if (isUnKnownEdge) {
                    /* we cannot publish only one node, at least two nodes needed for graph */
                    if (delimiter !== ' -> ') { // is it a first run?
                        if (prevNode.dependency !== '') { // is it not a "empty root" node?
                            /* publish first node of graph for a line. */
                            graph += `${delimiter}"${prevNode.dependency}"`;
                            delimiter = ' -> ';
                        }
                    }

                    graph += `${delimiter}"${node.dependency}"`;
                    delimiter = ' -> ';

                    knownEdges.push(edge);
                }

                prevNode = node;

                styledNode(node, projectNodes, taskNodes);
            }

            /* publish only none-empty lines */
            const msg = isVerbose ? `${graph} /* ${comment.trim()} */` : `${graph}`;
            if (msg.trim().length > 0) console.log(msg);
        } else {
            dumpFoundLines();
        }
    }

    position++;
    prevLevel = level;
}

if (isDot) {
    /* Publish styles for project and tasks nodes. */
    console.log(`    /* Style nodes for easier navigation. */`)

    projectNodes.forEach(node => {
        console.log(`    "${node.dependency}" [style=filled, fillcolor=green]`)
    })

    taskNodes.forEach(node => {
        console.log(`    "${node.dependency}" [style=filled, fillcolor=lightblue]`)
    })

    console.log('}');
}
// MAIN: end
