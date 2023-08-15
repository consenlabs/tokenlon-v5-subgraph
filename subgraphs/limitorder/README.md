# Subgraph for imToken LimitOrder contract in Goerli Testnet

## Prepare

- Please follow this [official document](https://thegraph.com/docs/en/cookbook/quick-start/) to install graph-cli

## Download and Compile

- Download

```shell
# Download
% git clone "git@github.com:consenlabs/tokenlon-v5-subgraph.git"
% code "tokenlon-v5-subgraph/"

# Get dependence
% yarn install
```

- Compile subgraph (Goerli Testnet)

```shell
% yarn run prepare:goerli && yarn run codegen && yarn run build
```

## Deploy for LimitOrder contract only in Goerli Testnet

```shell
% graph auth --studio <Your Deploy Key>
% yarn workspace "limitorder" run graph deploy --studio limitorder
```

Output:

```shell
yarn workspace v1.22.19
yarn run v1.22.19
$ /Users/irara/MyGithubOneleo/tokenlon-v5-subgraph/node_modules/.bin/graph deploy --studio limitorder
✔ Version Label (e.g. v0.0.1) · v0.0.1
  Skip migration: Bump mapping apiVersion from 0.0.1 to 0.0.2
  Skip migration: Bump mapping apiVersion from 0.0.2 to 0.0.3
  Skip migration: Bump mapping apiVersion from 0.0.3 to 0.0.4
  Skip migration: Bump mapping apiVersion from 0.0.4 to 0.0.5
  Skip migration: Bump mapping apiVersion from 0.0.5 to 0.0.6
  Skip migration: Bump manifest specVersion from 0.0.1 to 0.0.2
  Skip migration: Bump manifest specVersion from 0.0.2 to 0.0.4
✔ Apply migrations
✔ Load subgraph from subgraph.yaml
  Compile data source: LimitOrder => build/LimitOrder/LimitOrder.wasm
✔ Compile subgraph
  Copy schema file build/schema.graphql
  Write subgraph file build/LimitOrder/abis/LimitOrder.json
  Write subgraph manifest build/subgraph.yaml
✔ Write compiled subgraph to build/
  Add file to IPFS build/schema.graphql
                .. QmRtsYrCjJ2YHBJE1xxdm1tQJMzzveWygGwFbzC96t6aT4
  Add file to IPFS build/LimitOrder/abis/LimitOrder.json
                .. QmWtZnAiKbLZ9e6Z8jk6ApR5X9HQhQBn9JPV4P8jBzQvSh
  Add file to IPFS build/LimitOrder/LimitOrder.wasm
                .. QmUtpUNyP6P2JsxEPSuGLLH6YVUPHA2X9tf1v9q1vmJb8k
✔ Upload subgraph to IPFS

Build completed: QmYigtJzraLhczyemJtNVsUDBpCw741cKajvuUZNVmKUDC

Deployed to https://thegraph.com/studio/subgraph/limitorder

Subgraph endpoints:
Queries (HTTP):     https://api.studio.thegraph.com/query/34764/limitorder/v0.0.1

✨  Done in 40.66s.
✨  Done in 40.80s.
```

## Try GraphQL in Subgraph Playground

:notebook: Created by GraphQL Explorer in Subgraph Playground

```graphql
query MyQuery {
  orders(orderBy: firstFilledTime, first: 3) {
    id
    maker
    makerToken
    takerToken
    firstFilledTime
    lastFilledTime
    cancelledTime
    orderStatus
  }
  limitOrderFilleds(orderBy: blockTimestamp, first: 3) {
    id
    limitOrderFilledType
    makerTokenFilledAmount
    takerTokenFilledAmount
    recipient
    relayer
    profitRecipient
    blockTimestamp
  }
  limitOrderFilledByProtocols(orderBy: blockTimestamp, first: 3) {
    id
    relayer
    profitRecipient
    fillReceiptMakerTokenFilledAmount
    fillReceiptTakerTokenFilledAmount
    fillReceiptRemainingAmount
    takerTokenProfit
    takerTokenProfitFee
    takerTokenProfitBackToMaker
    blockTimestamp
  }
  limitOrderFilledByTraders(first: 3) {
    id
    recipient
    fillReceiptMakerTokenFilledAmount
    fillReceiptTakerTokenFilledAmount
    fillReceiptRemainingAmount
    blockTimestamp
  }
}
```

## Query output:

```
{
  "data": {
    "orders": [
      {
        "id": "0x3f2c773464fa2c2e69ac2d76d07106e33b4dcb057f07ac46676ecbccc395e2ef",
        "maker": "0x81b576c27dc24f1f5892c2016d1ae7cfc7bf6880",
        "makerToken": "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6",
        "takerToken": "0xa93ef9215b907c19e739e2214e1aa5412a0401b5",
        "firstFilledTime": "1663325172",
        "lastFilledOrCancelledTime": "1663325172",
        "orderStatus": "FullyFilled"
      },
      {
        "id": "0x8ef1b0f0ccfaa8b4e73957696b73f87b7b51b3fd71220eb71e6e0e6a4aa0fcf5",
        "maker": "0x83f95c33d61ef8814db62f83490f31e2741d0507",
        "makerToken": "0x6da0e6abd44175f50c563cd8b860dd988a7c3433",
        "takerToken": "0xa93ef9215b907c19e739e2214e1aa5412a0401b5",
        "firstFilledTime": "1663325220",
        "lastFilledOrCancelledTime": "1663325220",
        "orderStatus": "FullyFilled"
      },
      {
        "id": "0x56527f821250a9fddd5b9715dd00f206de30e8ca054179e17840b8e578dbf958",
        "maker": "0x81b576c27dc24f1f5892c2016d1ae7cfc7bf6880",
        "makerToken": "0x6da0e6abd44175f50c563cd8b860dd988a7c3433",
        "takerToken": "0xa93ef9215b907c19e739e2214e1aa5412a0401b5",
        "firstFilledTime": "1663325244",
        "lastFilledOrCancelledTime": "1663325244",
        "orderStatus": "FullyFilled"
      }
    ],
    "limitOrders": [
      {
        "id": "0x2e01f211fd39bd2c5281680057debb5e9e31b84cabf389721b5ed206c4b1de06-0x13c4a375ea5494258476b4139cc2313606a62c1d9c2342e0fda4c9f2d701b201-156",
        "limitOrderType": "ByProtocol",
        "makerTokenFilledAmount": "100000000000000000",
        "takerTokenFilledAmount": "402000000",
        "blockTimestamp": "1663325172"
      },
      {
        "id": "0xd7bf25963d75bcecb5e323796cf00cd77bbbe25631f88c9aee8cf8aeec5e8eb4-0x94b1e07a8411a4ebea04282ff92354b7acc26e0f15650c42536a452a137d7d78-304",
        "limitOrderType": "ByProtocol",
        "makerTokenFilledAmount": "10000000000000000000",
        "takerTokenFilledAmount": "27820700",
        "blockTimestamp": "1663325220"
      },
      {
        "id": "0x37aa37ea523ac640f1d50033b0148222786a361aca41116d59f6ff29762b718b-0x7b7ab03420759f39b154793f883ed1386a26439e6c1a94a476ee48fea32c2634-191",
        "limitOrderType": "ByProtocol",
        "makerTokenFilledAmount": "10000000000000000000",
        "takerTokenFilledAmount": "25000000",
        "blockTimestamp": "1663325244"
      }
    ],
    "limitOrderFilledByProtocols": [
      {
        "id": "0x2e01f211fd39bd2c5281680057debb5e9e31b84cabf389721b5ed206c4b1de06-0x13c4a375ea5494258476b4139cc2313606a62c1d9c2342e0fda4c9f2d701b201-156",
        "fillReceipt_makerTokenFilledAmount": "100000000000000000",
        "fillReceipt_takerTokenFilledAmount": "402000000",
        "fillReceipt_remainingAmount": "0",
        "blockTimestamp": "1663325172"
      },
      {
        "id": "0xd7bf25963d75bcecb5e323796cf00cd77bbbe25631f88c9aee8cf8aeec5e8eb4-0x94b1e07a8411a4ebea04282ff92354b7acc26e0f15650c42536a452a137d7d78-304",
        "fillReceipt_makerTokenFilledAmount": "10000000000000000000",
        "fillReceipt_takerTokenFilledAmount": "27820700",
        "fillReceipt_remainingAmount": "0",
        "blockTimestamp": "1663325220"
      },
      {
        "id": "0x37aa37ea523ac640f1d50033b0148222786a361aca41116d59f6ff29762b718b-0x7b7ab03420759f39b154793f883ed1386a26439e6c1a94a476ee48fea32c2634-191",
        "fillReceipt_makerTokenFilledAmount": "10000000000000000000",
        "fillReceipt_takerTokenFilledAmount": "25000000",
        "fillReceipt_remainingAmount": "0",
        "blockTimestamp": "1663325244"
      }
    ],
    "limitOrderFilledByTraders": []
  }
}
```

## Published to Graph Explorer on Goerli Testnet

- [Tokenlon Limit Order Subgraph on Goerli Testnet](https://testnet.thegraph.com/explorer/subgraph?id=DSCkswEpNfuaa5gwDWP514QXdtQs7Wh8hKruSN1sV97L)
