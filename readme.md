# Visualize Gradle Dependencies

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/OleksandrKucherenko/dependencies.graphviz)

- [Visualize Gradle Dependencies](#visualize-gradle-dependencies)
  - [Preview](#preview)
  - [Pre-requirements](#pre-requirements)
  - [Usage](#usage)
  - [Get Help](#get-help)
  - [Do analysis](#do-analysis)
    - [Segmentation](#segmentation)
  - [Troubleshooting](#troubleshooting)
    - [My VsCode configuration](#my-vscode-configuration)
    - [Apply NodeJs automatically on project folder entrance](#apply-nodejs-automatically-on-project-folder-entrance)

## Preview

![Preview](_docs_/interactive-dependency-analysis.gif)

## Pre-requirements

Clone project. Than install all required tools:

```bash
# requirements
#
# Install NVM, latest node
#
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
nvm install --lts
nvm use --lts
#
# Install DirEnv
#
curl -sfL https://direnv.net/install.sh | bash
#
# Install Yarn
#
curl -s https://raw.githubusercontent.com/tophat/yvm/master/scripts/install.js | node
yvm list-remote
#
# Install GraphViz tool
#
brew install graphviz
```

[Configure direnv properly](#apply-nodejs-automatically-on-project-folder-entrance) and than install the project dependencies.

```bash
#
# Install all required packages
#
cd dependencies.graphviz
direnv allow
yarn
``` 

## Usage

```bash
# collect project dependencies into file
# cd ~/src/android-project
./gradlew :project:app:dependencies | tee dependencies.log

# extract graph of dependencies from log file (com.fasterxml.jackson)
./index.dependencies.js dependencies.log --dot --simplify | tee jackson.dot

# extract graph of Moshi dependency usage (com.squareup.moshi:moshi)
./index.dependencies.js dependencies.log --dot --simplify --find com.squareup.moshi | tee moshi.dot

# convert graph to image
dot jackson.dot -Tpdf -o jackson.pdf
dot jackson.dot -Tsvg -o jackson.svg
dot jackson.dot -Tpng -o jackson.png
```

## Get Help

```bash
./index.dependencies.js --help 
```

Output:

```text
Usage: index.dependencies.js gradle_dependencies_log

Options:
      --version   Show version number                                  [boolean]
  -f, --find                                  [default: "com.fasterxml.jackson"]
      --help      Show help                                            [boolean]
  -v, --verbose   Publish debug information                            [boolean]
  -d, --dot       Print GraphViz dot graph instead                     [boolean]
  -s, --simplify  Remove version information from dependencies         [boolean]
  -l, --left      force graph building from left-to-right, instead of
                  top-to-bottom                                        [boolean]
```

## Do analysis

Install vsCode. `brew cask install visual-studio-code`

```bash
code --install-extension joaompinto.vscode-graphviz
code --install-extension vscode-interactive-graphviz
```

Open VsCode and inside it open `.dot` file. `Cmd+Shift+A` type: `Graphviz` and select `Graphviz Interactive: preview`.

On graph node click you will see a selected path.

![Preview](_docs_/interactive-diagram.png)

### Segmentation

In several cases we may need extraction of a graph for the one gradle task only. Unfortinately 
gradle do not give us this option, we can extract dependencies only by modules.

With small tricks is possible to limit the scope:

```bash
# extract from full log lines: 211573-216480 and produce shorter log
sed -n '211573,216480p' full-dependency.log >shorter-dependency.log

# produce graph from shorter log
./index.dependendencies.js shorter-dependency.log --simplify --dot >shorter.dot
```

## Troubleshooting 

### My VsCode configuration

```bash
# code --list-extensions

bierner.markdown-mermaid
codezombiech.gitignore
dbaeumer.vscode-eslint
EditorConfig.EditorConfig
esbenp.prettier-vscode
joaompinto.vscode-graphviz
k--kato.intellij-idea-keybindings
tintinweb.graphviz-interactive-preview
yzhang.markdown-all-in-one
```

### Apply NodeJs automatically on project folder entrance

```bash
# create extension file
touch ~/.direnvrc

#
# register new method in .diremvrc
#
echo "" >>~/.direnvrc
echo "use_nodejs() {" >>~/.direnvrc
echo "    NODE_VERSION=\"\$1\"" >>~/.direnvrc
echo "    type nvm >/dev/null 2>&1 || . ~/.nvm/nvm.sh" >>~/.direnvrc
echo "    nvm use \"\$NODE_VERSION\"" >>~/.direnvrc
echo "}" >>~/.direnvrc
echo "" >>~/.direnvrc

# apply method call
echo "use nodejs" >>.envrc

# re-enable direnv for folder after changes
direnv allow
```

refs:

- <http://blog.differentpla.net/blog/2019/01/30/nvm-direnv/>
