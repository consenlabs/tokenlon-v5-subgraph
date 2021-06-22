import { BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { Swapped as SwappedTuppleEvent, Swapped1 as SwappedEvent } from "../generated/AMMWrapperWithPath/AMMWrapperWithPath"
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
  entity.salt = ZERO
  entity.deadline = ZERO

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
    entity.salt = ZERO
    entity.deadline = ZERO

    log.info(entity.transactionHash, null)
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

  if (event.transaction.input != null) {
    // let addresses: Array<Address> = [
    //   Address.fromString(entity.makerAddr.toHex()),
    //   Address.fromString(entity.makerAssetAddr.toHex())
    // ]
    // let encoded = ethereum.encode(ethereum.Value.fromAddressArray(addresses))!
    // entity.inputs = encoded
    // let decoded = ethereum.decode('address[]', entity.inputs!)

    let input = event.transaction.input!
    // skip 4 bytes
    let rawPayloadInput = input.subarray(4, input.length) as Bytes
    let rawPayload = ethereum.decode('bytes', rawPayloadInput!)
    // skip 4 bytes
    let payload = rawPayload.toBytes().subarray(4, rawPayload.toBytes().length) as Bytes
    // fee factor
    // entity.inputs = payload.subarray(9 * 32, 10 * 32) as Bytes
    // signature
    // entity.inputs = payload.subarray(13 * 32, 18 * 32) as Bytes
    entity.inputs = payload.subarray(19 * 32) as Bytes    
    let pathByteStart = 19 * 32
    // maker specify data length
    let dataLengthByte = payload.subarray(18 * 32, 19 * 32) as Bytes
    let decodedDataLength = ethereum.decode('uint256', dataLengthByte!).toBigInt()
    if (decodedDataLength.gt(ZERO)) {
      // entity.xFeeFactor = decodedDataLength
      pathByteStart += decodedDataLength.toI32()
    }
    // entity.xFeeFactor = BigInt.fromI32(pathByteStart)
    // entity.inputs = payload.subarray(18 * 32, 19*32) as Bytes
    let pathLengthByte = payload.subarray(pathByteStart, pathByteStart + 32) as Bytes
    let decodedPathLength = ethereum.decode('uint256', pathLengthByte!).toBigInt()
    if (decodedPathLength.gt(ZERO)) {
      entity.xFeeFactor = decodedPathLength
      let path: Array<Bytes> = []
      entity.path.push(entity.makerAddr)
      for (let i = 1, j = decodedPathLength.toI32(); i <= j; i++) {
        let pathAddrStart = pathByteStart + i * 32
        let pathAddrByte = payload.subarray(pathAddrStart, pathAddrStart + 32) as Bytes
        // let decodedPathAddr = ethereum.decode('address', pathAddrByte!).toAddress()
        path.push(pathAddrByte!)
      }
      entity.path = path
    }
    // if (payload.length - 32 > pathByteStart) {
      // entity.inputs = payload.subarray(pathByteStart) as Bytes
      // let decodedPath = ethereum.decode('address[]', entity.inputs!)
      // entity.xFeeFactor = BigInt.fromI32(decodedPath.kind)
      // let arr = decodedPath.toBytes()
      // decodedPath.toTupleArray()
      // let pathArray = decodedPath.toBytesArray()
      // if (pathArray.length > 0) {
      //   entity.path = pathArray
      // }
    // }
    
    // (address,address,address,uint256,uint256,address,address,uint256,uint256,uint256,bytes,bytes,address[])
    // ((address,address,address,uint256,uint256,address,address,uint256,uint256),uint256,bytes,bytes,address[])
    // let decoded = ethereum.decode('bytes', entity.inputs!)
    // let xFeeFactor = decoded[9].toBigInt()
    // entity.xFeeFactor = xFeeFactor
  }

  log.info(entity.transactionHash, null)
  entity.save()
  swappedTotal.save()
  processSubsidizedTuppleEvent(event)

  addTradedToken(entity.takerAssetAddr as Address, event.block.timestamp.toI32())
  addTradedToken(entity.makerAssetAddr as Address, event.block.timestamp.toI32())

  let user = getUser(order.userAddr, event)
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

    log.info(entity.transactionHash, null)
    entity.save()
  }
}