import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { AMMWrapper, Swapped as SwappedEvent } from "../generated/AMMWrapper/AMMWrapper"
import { ERC20 } from "../generated/AMMWrapper2/ERC20"
import { isETH, WETH_ADDRESS } from "./helper"
import { Swapped, SubsidizedSwapped, SwappedTotal, TradedToken } from "../generated/schema"

export function handleSwapped(event: SwappedEvent): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let swappedTotalEntity = SwappedTotal.load('1')
  if (swappedTotalEntity == null) {
    swappedTotalEntity = new SwappedTotal('1')
    swappedTotalEntity.total = BigInt.fromI32(0)
  }
  let entity = Swapped.load(event.transaction.hash.toHex())
  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new Swapped(event.transaction.hash.toHex())
  }
  swappedTotalEntity.total = swappedTotalEntity.total.plus(BigInt.fromI32(1))
  // Entity fields can be set based on event parameters
  entity.txNumber = swappedTotalEntity.total
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.source = event.params.source
  entity.transactionHash = event.transaction.hash.toHex()
  entity.executeTxHash = event.params.transactionHash
  entity.userAddr = event.params.userAddr
  entity.takerAssetAddr = event.params.takerAssetAddr
  entity.takerAssetAmount = event.params.takerAssetAmount
  entity.makerAddr = event.params.makerAddr
  entity.makerAssetAddr = event.params.makerAssetAddr
  entity.makerAssetAmount = event.params.makerAssetAmount
  entity.receiverAddr = event.params.receiverAddr
  entity.settleAmount = event.params.settleAmount
  entity.receivedAmount = event.params.receivedAmount
  entity.feeFactor = event.params.feeFactor
  entity.subsidyFactor = event.params.subsidyFactor
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
  swappedTotalEntity.save()
  processSubsidizedEvent(event)
}

const processSubsidizedEvent = (event: SwappedEvent): void => {
  if (event.params.settleAmount.gt(event.params.receivedAmount)) {
    let entity = SubsidizedSwapped.load(event.params.transactionHash.toHex())

    // Entities only exist after they have been saved to the store;
    // `null` checks allow to create entities on demand
    if (entity == null) {
      entity = new SubsidizedSwapped(event.params.transactionHash.toHex())
    }

    // Entity fields can be set based on event parameters
    entity.from = event.transaction.from as Bytes
    entity.to = event.transaction.to as Bytes
    entity.source = event.params.source
    entity.transactionHash = event.transaction.hash.toHex()
    entity.executeTxHash = event.params.transactionHash
    entity.userAddr = event.params.userAddr
    entity.takerAssetAddr = event.params.takerAssetAddr
    entity.takerAssetAmount = event.params.takerAssetAmount
    entity.makerAddr = event.params.makerAddr
    entity.makerAssetAddr = event.params.makerAssetAddr
    entity.makerAssetAmount = event.params.makerAssetAmount
    entity.receiverAddr = event.params.receiverAddr
    entity.settleAmount = event.params.settleAmount
    entity.receivedAmount = event.params.receivedAmount
    entity.feeFactor = event.params.feeFactor
    entity.subsidyFactor = event.params.subsidyFactor
    entity.blockNumber = event.block.number
    entity.logIndex = event.logIndex
    entity.eventAddr = event.address
    entity.gasPrice = event.transaction.gasPrice
    entity.timestamp = event.block.timestamp.toI32()

    log.info(entity.transactionHash, null)
    entity.save()
  }
}
