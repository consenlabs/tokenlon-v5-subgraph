import { BigInt, Bytes, Address, ethereum } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'
import { Swapped as SwappedTuppleEvent, Swapped1 as SwappedEvent } from '../generated/AMMWrapperWithPath/AMMWrapperWithPath'
import { ZERO, addTradedToken, getUser, getEventID } from './helper'
import { Swapped, SubsidizedSwapped, SwappedTotal } from '../generated/schema'

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
  entity.salt = ZERO
  entity.deadline = ZERO

  log.info('SwappedEvent transaction hash: {}', [entity.transactionHash])

  entity.save()
  swappedTotal.save()
  processSubsidizedEvent(event)

  addTradedToken(entity.takerAssetAddr, event.block.timestamp)
  addTradedToken(entity.makerAssetAddr, event.block.timestamp)

  const user = getUser(event.params.userAddr, event)!
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
    entity.salt = ZERO
    entity.deadline = ZERO

    log.info('ProcessSubsidizedEvent transaction hash: {}', [entity.transactionHash])
    entity.save()
  }
}

export function handleSwappedTupple(event: SwappedTuppleEvent): void {
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
  let txMetaData = event.params.param0
  let order = event.params.order
  entity.txNumber = swappedTotal.total
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.blockHash = event.block.hash.toHex()
  entity.source = txMetaData.source
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.timestamp = event.block.timestamp.toI32()
  entity.executeTxHash = txMetaData.transactionHash
  entity.settleAmount = txMetaData.settleAmount
  entity.receivedAmount = txMetaData.receivedAmount
  entity.feeFactor = txMetaData.feeFactor
  entity.subsidyFactor = txMetaData.subsidyFactor
  entity.userAddr = order.userAddr
  entity.takerAssetAddr = order.takerAssetAddr
  entity.takerAssetAmount = order.takerAssetAmount
  entity.makerAddr = order.makerAddr
  entity.makerAssetAddr = order.makerAssetAddr
  entity.makerAssetAmount = order.makerAssetAmount
  entity.receiverAddr = order.receiverAddr
  entity.salt = order.salt
  entity.deadline = order.deadline

  if (event.transaction.input !== null) {
    const input = event.transaction.input
    // skip method bytes
    const rawPayloadInput = Bytes.fromUint8Array(input.subarray(4, input.length))
    const rawPayload = ethereum.decode('bytes', rawPayloadInput)!
    // skip method bytes
    const payload = Bytes.fromUint8Array(rawPayload.toBytes().subarray(4, rawPayload.toBytes().length))
    let pathByteStart = 19 * 32
    // decode maker specify data length
    const dataLengthByte = Bytes.fromUint8Array(payload.subarray(18 * 32, 19 * 32))
    const decodedDataLength = ethereum.decode('uint256', dataLengthByte)!.toBigInt()
    if (decodedDataLength.gt(ZERO)) {
      pathByteStart += decodedDataLength.toI32()
    }
    const pathLengthByte = Bytes.fromUint8Array(payload.subarray(pathByteStart, pathByteStart + 32))
    const decodedPathLength = ethereum.decode('uint256', pathLengthByte)!.toBigInt()
    if (decodedPathLength.gt(ZERO)) {
      let path: Array<Bytes> = []
      for (let i = 1, j = decodedPathLength.toI32(); i <= j; i++) {
        let pathAddrStart = pathByteStart + i * 32
        const pathAddrByte = Bytes.fromUint8Array(payload.subarray(pathAddrStart, pathAddrStart + 32))
        path.push(pathAddrByte)
      }
      entity.path = path
    }
  }

  log.info('SwappedTuppleEvent transaction hash: {}', [entity.transactionHash])

  entity.save()
  swappedTotal.save()
  processSubsidizedTuppleEvent(event)

  addTradedToken(entity.takerAssetAddr, event.block.timestamp)
  addTradedToken(entity.makerAssetAddr, event.block.timestamp)

  const user = getUser(order.userAddr, event)!
  user.tradeCount += 1
  user.lastSeen = event.block.timestamp.toI32()
  user.save()
}

const processSubsidizedTuppleEvent = (event: SwappedTuppleEvent): void => {
  let txMetaData = event.params.param0
  let order = event.params.order
  if (txMetaData.settleAmount.gt(txMetaData.receivedAmount)) {
    let subSwappedID = getEventID(event)
    let entity = SubsidizedSwapped.load(subSwappedID)
    if (entity == null) {
      entity = new SubsidizedSwapped(subSwappedID)
    }
    entity.from = event.transaction.from as Bytes
    entity.to = event.transaction.to as Bytes
    entity.blockHash = event.block.hash.toHex()
    entity.source = txMetaData.source
    entity.transactionHash = event.transaction.hash.toHex()
    entity.blockNumber = event.block.number
    entity.logIndex = event.logIndex
    entity.eventAddr = event.address
    entity.gasPrice = event.transaction.gasPrice
    entity.timestamp = event.block.timestamp.toI32()
    entity.executeTxHash = txMetaData.transactionHash
    entity.settleAmount = txMetaData.settleAmount
    entity.receivedAmount = txMetaData.receivedAmount
    entity.feeFactor = txMetaData.feeFactor
    entity.subsidyFactor = txMetaData.subsidyFactor
    entity.userAddr = order.userAddr
    entity.takerAssetAddr = order.takerAssetAddr
    entity.takerAssetAmount = order.takerAssetAmount
    entity.makerAddr = order.makerAddr
    entity.makerAssetAddr = order.makerAssetAddr
    entity.makerAssetAmount = order.makerAssetAmount
    entity.receiverAddr = order.receiverAddr
    entity.salt = order.salt
    entity.deadline = order.deadline

    log.info('ProcessSubsidizedTuppleEvent transaction hash: {}', [entity.transactionHash])
    entity.save()
  }
}
