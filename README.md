# Tokenlon Version 5 Subgraph

## Installation

Install global commands.

```
# NPM
$ npm install -g truffle ganache-cli

# Yarn
$ yarn global add truffle ganache-cli
```

Install dependencies
```
# NPM
npm install

# Yarn
yarn
```

## Generate Schema

```
yarn codegen
```

Writing your mapper algorithm after doing codegen under `src` folder.

## Compile AssemblyScript

```
yarn build
```

## Deploy Subgraph

Prerequisite:
1. Go to [official website](https://thegraph.com/explorer) and register an account.
2. Get your `<access-token>` in your subgraph space.

Should execute auth command first.
```
graph auth [options] <node> <access-token>
```
Deploy to testing subgraph space.

```
yarn deploy
```

## Playground

Go to [playground](https://thegraph.com/explorer/subgraph/benjaminlu/tokenlon-v5-subgraph) and test your query.

**Once all events are determined, the subgraph would be moved to official subgraph space.**