import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { PMM, FillOrder as FillOrderEvent } from "../generated/PMM/PMM"
import { ERC20 } from "../generated/PMM/ERC20"
import { isETH, WETH_ADDRESS } from "./helper"
import { FillOrder, FillOrderTotal, TradedToken } from "../generated/schema"

export function handleFillOrder(event: FillOrderEvent): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let fillTotalEntity = FillOrderTotal.load('1')
  if (fillTotalEntity == null) {
    fillTotalEntity = new FillOrderTotal('1')
    fillTotalEntity.total = BigInt.fromI32(0)
  }

  let entity = FillOrder.load(event.transaction.hash.toHex())
  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new FillOrder(event.transaction.hash.toHex())
  }

  fillTotalEntity.total = fillTotalEntity.total.plus(BigInt.fromI32(1))
  // Entity fields can be set based on event parameters
  entity.txNumber = fillTotalEntity.total
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.source = event.params.source
  entity.transactionHash = event.transaction.hash.toHex()
  entity.executeTxHash = event.params.transactionHash
  entity.orderHash = event.params.orderHash
  entity.userAddr = event.params.userAddr
  entity.takerAssetAddr = event.params.takerAssetAddr
  entity.takerAssetAmount = event.params.takerAssetAmount
  entity.makerAddr = event.params.makerAddr
  entity.makerAssetAddr = event.params.makerAssetAddr
  entity.makerAssetAmount = event.params.makerAssetAmount
  entity.receiverAddr = event.params.receiverAddr
  entity.settleAmount = event.params.settleAmount
  entity.feeFactor = event.params.feeFactor
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.timestamp = event.block.timestamp.toI32()

  let takerAddr = entity.takerAssetAddr.toHex()
  if (isETH(takerAddr)) {
    takerAddr = WETH_ADDRESS
  }
  // check whether token is in the traded token
  let takerTradedToken = TradedToken.load(takerAddr)
  if (takerTradedToken == null) {
    let takerTradedTokenContract = ERC20.bind(Address.fromString(takerAddr))
    if (!takerTradedTokenContract.try_decimals().reverted) {
      takerTradedToken = new TradedToken(takerAddr)
      takerTradedToken.address = entity.takerAssetAddr
      takerTradedToken.startDate = event.block.timestamp.toI32()
      takerTradedToken.decimals = takerTradedTokenContract.decimals()
      takerTradedToken.name = takerTradedTokenContract.name()
      takerTradedToken.symbol = takerTradedTokenContract.symbol()
      takerTradedToken.save()
    }
  }

  let makerAddr = entity.makerAssetAddr.toHex()
  if (isETH(makerAddr)) {
    makerAddr = WETH_ADDRESS
  }
  // check whether token is in the traded token
  let makerTradedToken = TradedToken.load(makerAddr)
  if (makerTradedToken == null) {
    let makerTradedTokenContract = ERC20.bind(Address.fromString(makerAddr))
    if (!makerTradedTokenContract.try_decimals().reverted) {
      makerTradedToken = new TradedToken(makerAddr)
      makerTradedToken.address = entity.makerAssetAddr
      makerTradedToken.startDate = event.block.timestamp.toI32()
      makerTradedToken.decimals = makerTradedTokenContract.decimals()
      makerTradedToken.name = makerTradedTokenContract.name()
      makerTradedToken.symbol = makerTradedTokenContract.symbol()
      makerTradedToken.save()
    }
  }

  log.info(entity.transactionHash, null)

  // Entities can be written to the store with `.save()`
  entity.save()
  fillTotalEntity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.EIP712_DOMAIN_HASH(...)
  // - contract.SOURCE(...)
  // - contract.operator(...)
  // - contract.permStorage(...)
  // - contract.spender(...)
  // - contract.userProxy(...)
  // - contract.version(...)
  // - contract.zeroExchange(...)
  // - contract.zxERC20Proxy(...)
}
