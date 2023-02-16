import { BigInt, Address, Bytes, log } from '@graphprotocol/graph-ts'
import {
  LimitOrderFilledByProtocol as LimitOrderFilledByProtocolEvent,
  LimitOrderFilledByProtocol1 as LimitOrderFilledByProtocolGoerliEvent,
  LimitOrderFilledByTrader as LimitOrderFilledByTraderEvent,
  OrderCancelled as OrderCancelledEvent
} from '../generated/LimitOrder/LimitOrder'
import { LimitOrderFilledByProtocol as LimitOrderFilledByProtocolEntity, LimitOrderFilledByTrader as LimitOrderFilledByTraderEntity, OrderCancelled as OrderCancelledEntity, Order as OrderEntity, LimitOrder as LimitOrderEntity } from '../generated/schema'
import { addTradedToken, getEventID } from './helper'

// Define the enumeration content of the subgraph to avoid string input errors,
// these errors only occur after deploying to Subgraph Studio and indexing.
namespace OrderStatus {
  export const Normal = 'Normal'
  export const Cancelled = 'Cancelled'
  export const FullyFilled = 'FullyFilled'
}
namespace LimitOrderTypes {
  export const ByProtocol = 'ByProtocol'
  export const ByTrader = 'ByTrader'
}

// Handling function when the LimitOrderFilledByProtocol event occurs
export function handleLimitOrderFilledByProtocol(event: LimitOrderFilledByProtocolEvent): void {
  // Record the data of this LimitOrderFilledByProtocol event
  const eventId = getEventID(event)
  const entity = new LimitOrderFilledByProtocolEntity(eventId)
  entity.orderHash = event.params.orderHash
  entity.maker = event.params.maker
  entity.taker = event.params.taker
  entity.allowFillHash = event.params.allowFillHash
  entity.relayer = event.params.relayer
  entity.profitRecipient = event.params.profitRecipient
  entity.fillReceiptMakerToken = event.params.fillReceipt.makerToken
  entity.fillReceiptTakerToken = event.params.fillReceipt.takerToken
  entity.fillReceiptMakerTokenFilledAmount = event.params.fillReceipt.makerTokenFilledAmount
  entity.fillReceiptTakerTokenFilledAmount = event.params.fillReceipt.takerTokenFilledAmount
  entity.fillReceiptRemainingAmount = event.params.fillReceipt.remainingAmount
  entity.fillReceiptMakerTokenFee = event.params.fillReceipt.makerTokenFee
  entity.fillReceiptTakerTokenFee = event.params.fillReceipt.takerTokenFee
  // Event parameters of relayerTakerTokenProfitFee, relayerTakerTokenProfitFee for LimitOrder on Mainnet
  entity.relayerTakerTokenProfit = event.params.relayerTakerTokenProfit
  entity.relayerTakerTokenProfitFee = event.params.relayerTakerTokenProfitFee
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), entity.id])
  // Entity must be saved after setting
  entity.save()

  // Record the tokens data of this LimitOrderFilledByProtocol event
  addTradedToken(entity.fillReceiptMakerToken, event.block.timestamp)
  addTradedToken(entity.fillReceiptTakerToken, event.block.timestamp)

  // Get the order hash as order entity id
  const orderId = event.params.orderHash.toHex()
  // Load old or create new Order entity
  let orderEntity = OrderEntity.load(orderId)
  if (orderEntity == null) {
    orderEntity = new OrderEntity(orderId)
    orderEntity.orderStatus = OrderStatus.Normal
    orderEntity.maker = event.params.maker
    orderEntity.makerToken = event.params.fillReceipt.makerToken
    orderEntity.takerToken = event.params.fillReceipt.takerToken
    orderEntity.firstFilledTime = event.block.timestamp
    orderEntity.cancelledTime = BigInt.fromI32(0)
    // Set the relationship of the first LimitOrderFilled entity under the same orderHash
    orderEntity.limitOrderFilledId = new Array<string>(0)
    log.info('Order entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), orderEntity.id])
  }
  orderEntity.lastFilledTime = event.block.timestamp
  // Set the relationship of this LimitOrderFilled entity under the same orderHash
  const limitOrderFilledArray = orderEntity.limitOrderFilledId
  limitOrderFilledArray.push(eventId)
  orderEntity.limitOrderFilledId = limitOrderFilledArray
  // If the order is filled all for this time
  if (event.params.fillReceipt.remainingAmount.equals(BigInt.fromI32(0))) {
    orderEntity.orderStatus = OrderStatus.FullyFilled
    log.info('Order is filled all, the order hash: {}.', [orderEntity.id])
  }
  // Entity must be saved after setting
  orderEntity.save()

  // Load old or create new LimitOrder entity
  let limitOrderEntity = LimitOrderEntity.load(eventId)
  if (limitOrderEntity == null) {
    limitOrderEntity = new LimitOrderEntity(eventId)
    limitOrderEntity.orderId = orderId
    limitOrderEntity.limitOrderType = LimitOrderTypes.ByProtocol
    limitOrderEntity.maker = event.params.maker as Bytes
    limitOrderEntity.taker = event.params.taker as Bytes
    limitOrderEntity.makerToken = event.params.fillReceipt.makerToken as Bytes
    limitOrderEntity.takerToken = event.params.fillReceipt.takerToken as Bytes
    limitOrderEntity.allowFillHash = event.params.allowFillHash
    limitOrderEntity.makerTokenFilledAmount = event.params.fillReceipt.makerTokenFilledAmount
    limitOrderEntity.takerTokenFilledAmount = event.params.fillReceipt.takerTokenFilledAmount
    limitOrderEntity.remainingAmount = event.params.fillReceipt.remainingAmount
    limitOrderEntity.makerTokenFee = event.params.fillReceipt.makerTokenFee
    limitOrderEntity.takerTokenFee = event.params.fillReceipt.takerTokenFee
    limitOrderEntity.relayer = event.params.relayer as Bytes
    limitOrderEntity.profitRecipient = event.params.profitRecipient as Bytes
    // Event parameters of relayerTakerTokenProfitFee, relayerTakerTokenProfitFee for LimitOrder on Mainnet
    limitOrderEntity.relayerTakerTokenProfit = event.params.relayerTakerTokenProfit
    limitOrderEntity.relayerTakerTokenProfitFee = event.params.relayerTakerTokenProfitFee
    // recipient is only used by the LimitOrderFilledByTrader event.
    limitOrderEntity.recipient = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.blockNumber = event.block.number
    limitOrderEntity.blockTimestamp = event.block.timestamp
    limitOrderEntity.transactionHash = event.transaction.hash
  }
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), limitOrderEntity.id])
  // Entity must be saved after setting
  limitOrderEntity.save()
}

// Handling function when the LimitOrderFilledByProtocolGoerli event occurs
export function handleLimitOrderFilledByProtocolGoerli(event: LimitOrderFilledByProtocolGoerliEvent): void {
  // Record the data of this LimitOrderFilledByProtocol event
  const eventId = getEventID(event)
  const entity = new LimitOrderFilledByProtocolEntity(eventId)
  entity.orderHash = event.params.orderHash
  entity.maker = event.params.maker
  entity.taker = event.params.taker
  entity.allowFillHash = event.params.allowFillHash
  entity.relayer = event.params.relayer
  entity.profitRecipient = event.params.profitRecipient
  entity.fillReceiptMakerToken = event.params.fillReceipt.makerToken
  entity.fillReceiptTakerToken = event.params.fillReceipt.takerToken
  entity.fillReceiptMakerTokenFilledAmount = event.params.fillReceipt.makerTokenFilledAmount
  entity.fillReceiptTakerTokenFilledAmount = event.params.fillReceipt.takerTokenFilledAmount
  entity.fillReceiptRemainingAmount = event.params.fillReceipt.remainingAmount
  entity.fillReceiptMakerTokenFee = event.params.fillReceipt.makerTokenFee
  entity.fillReceiptTakerTokenFee = event.params.fillReceipt.takerTokenFee
  // Event parameters of takerTokenProfit, takerTokenProfitFee for LimitOrder on Goerli
  entity.relayerTakerTokenProfit = event.params.takerTokenProfit
  entity.relayerTakerTokenProfitFee = event.params.takerTokenProfitFee
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), entity.id])
  // Entity must be saved after setting
  entity.save()

  // Record the tokens data of this LimitOrderFilledByProtocol event
  addTradedToken(entity.fillReceiptMakerToken, event.block.timestamp)
  addTradedToken(entity.fillReceiptTakerToken, event.block.timestamp)

  // Get the order hash as order entity id
  const orderId = event.params.orderHash.toHex()
  // Load old or create new Order entity
  let orderEntity = OrderEntity.load(orderId)
  if (orderEntity == null) {
    orderEntity = new OrderEntity(orderId)
    orderEntity.orderStatus = OrderStatus.Normal
    orderEntity.maker = event.params.maker
    orderEntity.makerToken = event.params.fillReceipt.makerToken
    orderEntity.takerToken = event.params.fillReceipt.takerToken
    orderEntity.firstFilledTime = event.block.timestamp
    orderEntity.cancelledTime = BigInt.fromI32(0)
    // Set the relationship of the first LimitOrderFilled entity under the same orderHash
    orderEntity.limitOrderFilledId = new Array<string>(0)
    log.info('Order entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), orderEntity.id])
  }
  orderEntity.lastFilledTime = event.block.timestamp
  // Set the relationship of this LimitOrderFilled entity under the same orderHash
  const limitOrderFilledArray = orderEntity.limitOrderFilledId
  limitOrderFilledArray.push(eventId)
  orderEntity.limitOrderFilledId = limitOrderFilledArray
  // If the order is filled all for this time
  if (event.params.fillReceipt.remainingAmount.equals(BigInt.fromI32(0))) {
    orderEntity.orderStatus = OrderStatus.FullyFilled
    log.info('Order is filled all, the order hash: {}.', [orderEntity.id])
  }
  // Entity must be saved after setting
  orderEntity.save()

  // Load old or create new LimitOrder entity
  let limitOrderEntity = LimitOrderEntity.load(eventId)
  if (limitOrderEntity == null) {
    limitOrderEntity = new LimitOrderEntity(eventId)
    limitOrderEntity.orderId = orderId
    limitOrderEntity.limitOrderType = LimitOrderTypes.ByProtocol
    limitOrderEntity.maker = event.params.maker as Bytes
    limitOrderEntity.taker = event.params.taker as Bytes
    limitOrderEntity.makerToken = event.params.fillReceipt.makerToken as Bytes
    limitOrderEntity.takerToken = event.params.fillReceipt.takerToken as Bytes
    limitOrderEntity.allowFillHash = event.params.allowFillHash
    limitOrderEntity.makerTokenFilledAmount = event.params.fillReceipt.makerTokenFilledAmount
    limitOrderEntity.takerTokenFilledAmount = event.params.fillReceipt.takerTokenFilledAmount
    limitOrderEntity.remainingAmount = event.params.fillReceipt.remainingAmount
    limitOrderEntity.makerTokenFee = event.params.fillReceipt.makerTokenFee
    limitOrderEntity.takerTokenFee = event.params.fillReceipt.takerTokenFee
    limitOrderEntity.relayer = event.params.relayer as Bytes
    limitOrderEntity.profitRecipient = event.params.profitRecipient as Bytes
    // Event parameters of takerTokenProfit, takerTokenProfitFee for LimitOrder on Goerli
    limitOrderEntity.relayerTakerTokenProfit = event.params.takerTokenProfit
    limitOrderEntity.relayerTakerTokenProfitFee = event.params.takerTokenProfitFee
    // recipient is only used by the LimitOrderFilledByTrader event.
    limitOrderEntity.recipient = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.blockNumber = event.block.number
    limitOrderEntity.blockTimestamp = event.block.timestamp
    limitOrderEntity.transactionHash = event.transaction.hash
  }
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), limitOrderEntity.id])
  // Entity must be saved after setting
  limitOrderEntity.save()
}

// Handling function when the LimitOrderFilledByTrader event occurs
export function handleLimitOrderFilledByTrader(event: LimitOrderFilledByTraderEvent): void {
  // Record the data of this LimitOrderFilledByTrader event
  const eventId = getEventID(event)
  const entity = new LimitOrderFilledByTraderEntity(eventId)
  entity.orderHash = event.params.orderHash
  entity.maker = event.params.maker
  entity.taker = event.params.taker
  entity.allowFillHash = event.params.allowFillHash
  entity.recipient = event.params.recipient
  entity.fillReceiptMakerToken = event.params.fillReceipt.makerToken
  entity.fillReceiptTakerToken = event.params.fillReceipt.takerToken
  entity.fillReceiptMakerTokenFilledAmount = event.params.fillReceipt.makerTokenFilledAmount
  entity.fillReceiptTakerTokenFilledAmount = event.params.fillReceipt.takerTokenFilledAmount
  entity.fillReceiptRemainingAmount = event.params.fillReceipt.remainingAmount
  entity.fillReceiptMakerTokenFee = event.params.fillReceipt.makerTokenFee
  entity.fillReceiptTakerTokenFee = event.params.fillReceipt.takerTokenFee
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  log.info('LimitOrderFilledByTrader entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), entity.id])
  // Entity must be saved after setting
  entity.save()

  // Record the tokens data of this LimitOrderFilledByProtocol event
  addTradedToken(entity.fillReceiptMakerToken, event.block.timestamp)
  addTradedToken(entity.fillReceiptTakerToken, event.block.timestamp)

  // Get the order hash as order entity id
  const orderId = event.params.orderHash.toHex()
  // Load old or create new Order entity
  let orderEntity = OrderEntity.load(orderId)
  if (orderEntity == null) {
    orderEntity = new OrderEntity(orderId)
    orderEntity.orderStatus = OrderStatus.Normal
    orderEntity.maker = event.params.maker
    orderEntity.makerToken = event.params.fillReceipt.makerToken
    orderEntity.takerToken = event.params.fillReceipt.takerToken
    orderEntity.firstFilledTime = event.block.timestamp
    orderEntity.cancelledTime = BigInt.fromI32(0)
    // Set the relationship of the first LimitOrderFilled entity under the same orderHash
    orderEntity.limitOrderFilledId = new Array<string>(0)
    log.info('Order entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), orderEntity.id])
  }
  orderEntity.lastFilledTime = event.block.timestamp
  // Set the relationship of this LimitOrderFilled entity under the same orderHash
  const limitOrderFilledArray = orderEntity.limitOrderFilledId
  limitOrderFilledArray.push(eventId)
  orderEntity.limitOrderFilledId = limitOrderFilledArray
  // If the order is filled all for this time
  if (event.params.fillReceipt.remainingAmount.equals(BigInt.fromI32(0))) {
    orderEntity.orderStatus = OrderStatus.FullyFilled
    log.info('Order is filled all, the order hash: {}.', [orderEntity.id])
  }
  // Entity must be saved after setting
  orderEntity.save()

  // Load old or create new LimitOrder entity
  let limitOrderEntity = LimitOrderEntity.load(eventId)
  if (limitOrderEntity == null) {
    limitOrderEntity = new LimitOrderEntity(eventId)
    limitOrderEntity.orderId = orderId
    limitOrderEntity.limitOrderType = LimitOrderTypes.ByTrader
    limitOrderEntity.maker = event.params.maker as Bytes
    limitOrderEntity.taker = event.params.taker as Bytes
    limitOrderEntity.makerToken = event.params.fillReceipt.makerToken as Bytes
    limitOrderEntity.takerToken = event.params.fillReceipt.takerToken as Bytes
    limitOrderEntity.allowFillHash = event.params.allowFillHash
    limitOrderEntity.makerTokenFilledAmount = event.params.fillReceipt.makerTokenFilledAmount
    limitOrderEntity.takerTokenFilledAmount = event.params.fillReceipt.takerTokenFilledAmount
    limitOrderEntity.remainingAmount = event.params.fillReceipt.remainingAmount
    limitOrderEntity.makerTokenFee = event.params.fillReceipt.makerTokenFee
    limitOrderEntity.takerTokenFee = event.params.fillReceipt.takerTokenFee
    limitOrderEntity.recipient = event.params.recipient as Bytes
    // relayer, profitRecipient, relayerTakerTokenProfit, relayerTakerTokenProfitFee
    // are only used by the LimitOrderFilledByProtocol event.
    limitOrderEntity.relayer = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.profitRecipient = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.relayerTakerTokenProfit = BigInt.fromI32(0)
    limitOrderEntity.relayerTakerTokenProfitFee = BigInt.fromI32(0)
    limitOrderEntity.blockNumber = event.block.number
    limitOrderEntity.blockTimestamp = event.block.timestamp
    limitOrderEntity.transactionHash = event.transaction.hash
  }
  log.info('LimitOrderFilledByTrader entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), limitOrderEntity.id])
  // Entity must be saved after setting
  limitOrderEntity.save()
}

// Handling function when the OrderCancelled event occurs
export function handleOrderCancelled(event: OrderCancelledEvent): void {
  // Record the data of this OrderCancelled event
  const eventId = getEventID(event)
  const entity = new OrderCancelledEntity(eventId)
  entity.orderHash = event.params.orderHash
  entity.maker = event.params.maker
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  // Entity must be saved after setting
  entity.save()

  // Get the order entity and set it to be canceled by maker
  let orderEntity = OrderEntity.load(event.params.orderHash.toHex())
  if (orderEntity != null) {
    orderEntity.orderStatus = 'Cancelled'
    orderEntity.cancelledTime = event.block.timestamp
    log.info('Order cancelled by maker at transaction hash: {}.', [event.transaction.hash.toHex()])
    // Entity must be saved after setting
    orderEntity.save()
  }
}
