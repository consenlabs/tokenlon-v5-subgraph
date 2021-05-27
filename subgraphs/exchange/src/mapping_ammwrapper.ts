import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { Swapped as SwappedEvent } from "../generated/AMMWrapper/AMMWrapper"
import { ZERO, addTradedToken, getUser, getEventID } from "./helper"
import { Swapped, SubsidizedSwapped, SwappedTotal } from "../generated/schema"

export function handleSwapped(event: SwappedEvent): void {
  let swappedTotal = SwappedTotal.load('1')
  if (swappedTotal == null) {
    swappedTotal = new SwappedTotal('1')
    swappedTotal.total = ZERO
  }

  let swappedID = getEventID(event)
  let entity = Swapped.load(swappedID)
  if (entity == null) {
    entity = new Swapped(swappedID)
  }

  swappedTotal.total = swappedTotal.total.plus(BigInt.fromI32(1))
  entity.txNumber = swappedTotal.total
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.source = event.params.source
  entity.blockHash = event.block.hash.toHex()
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
  swappedTotal.save()
  processSubsidizedEvent(event)

  addTradedToken(entity.takerAssetAddr as Address, event.block.timestamp.toI32())
  addTradedToken(entity.makerAssetAddr as Address, event.block.timestamp.toI32())

  let user = getUser(event.params.userAddr, event)
  user.tradeCount += 1
  user.lastSeen = event.block.timestamp.toI32()
  user.save()
}

const processSubsidizedEvent = (event: SwappedEvent): void => {
  if (event.params.settleAmount.gt(event.params.receivedAmount)) {
    let subSwappedID = getEventID(event)
    let entity = SubsidizedSwapped.load(subSwappedID)
    if (entity == null) {
      entity = new SubsidizedSwapped(subSwappedID)
    }
    
    entity.from = event.transaction.from as Bytes
    entity.to = event.transaction.to as Bytes
    entity.source = event.params.source
    entity.blockHash = event.block.hash.toHex()
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
