# Tokenlon Version 5 Subgraph

Provide the historical and analytics data for Tokenlon.

The Graph exposes a GraphQL endpoint to query the events and entities within the Tokenlon ecosytem.

Current subgraph locations:
    
* Exchange: includes all Tokenlon Exchange (AMM/PMM) data
    
    https://thegraph.com/explorer/subgraph/consenlabs/tokenlon-v5-exchange

* Staking: includes all Tokenlon Staking (Staking/Buyback) data
    
    https://thegraph.com/explorer/subgraph/consenlabs/tokenlon-v5-staking



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
$ npm install

# Yarn
$ yarn
```

## Generate subgraph yaml file

Generate subgraph yaml for Ethereum mainnet
```
$ yarn prepare:mainnet
```

Generate subgraph yaml for Ethereum goerli
```
$ yarn prepare:goerli
```

## Generate Schema

```
$ yarn codegen
```

Writing your mapper algorithm after doing codegen under `src` folder.

## Compile AssemblyScript

```
$ yarn build
```

## Deploy Subgraph

Prerequisite:
1. Go to [official website](https://thegraph.com/explorer) and register an account.
2. Get your `<access-token>` in your subgraph space.

Should execute auth command first.
```
$ graph auth [options] <node> <access-token>
```
Deploy to subgraph space.

```
$ yarn deploy
```

Deploy to testing subgraph space.

```
$ SUBGRAPH_USER=username yarn deploy-staging
```

## To query these subgraphs

Please use our node utility: [tokenlon-v5-data](https://github.com/consenlabs/tokenlon-v5-data).

Note: This is in on going development as well.