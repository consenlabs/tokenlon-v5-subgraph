import { BigInt, Address, Bytes, log } from '@graphprotocol/graph-ts'
import {
  LimitOrderFilledByProtocol as LimitOrderFilledByProtocolMainnetEvent,
  LimitOrderFilledByProtocol1 as LimitOrderFilledByProtocolEvent,
  LimitOrderFilledByTrader as LimitOrderFilledByTraderEvent,
  OrderCancelled as OrderCancelledEvent
} from '../generated/LimitOrder/LimitOrder'
import {
  LimitOrderFilledByProtocol as LimitOrderFilledByProtocolEntity,
  LimitOrderFilledByTrader as LimitOrderFilledByTraderEntity,
  OrderCancelled as OrderCancelledEntity,
  Order as OrderEntity,
  LimitOrderFilled as LimitOrderFilledEntity
} from '../generated/schema'
import { addTradedToken, getEventID } from './helper'

// Define the enumeration content within the subgraph to prevent string input errors,
// which may only arise after deployment to Subgraph Studio and during indexing.
namespace OrderStatus {
  export const Normal = 'Normal'
  export const Cancelled = 'Cancelled'
  export const FullyFilled = 'FullyFilled'
}
namespace LimitOrderTypes {
  export const ByProtocol = 'ByProtocol'
  export const ByTrader = 'ByTrader'
}

// Function to handle the occurrence of the LimitOrderFilledByProtocolMainnet event
export function handleLimitOrderFilledByProtocolMainnet(event: LimitOrderFilledByProtocolMainnetEvent): void {
  // Store the data from this LimitOrderFilledByProtocol event.
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
  // Event parameters for relayerTakerTokenProfitFee and relayerTakerTokenProfitFee related to LimitOrder on the Mainnet.
  entity.takerTokenProfit = event.params.relayerTakerTokenProfit
  entity.takerTokenProfitFee = event.params.relayerTakerTokenProfitFee
  // Event parameter for takerTokenProfitBackToMaker is exclusive to Arbitrum and Goerli.
  entity.takerTokenProfitBackToMaker = BigInt.fromI32(0)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), entity.id])
  // The entity should be saved after configuration.
  entity.save()

  // Store the token data from this LimitOrderFilledByProtocol event.
  addTradedToken(entity.fillReceiptMakerToken, event.block.timestamp)
  addTradedToken(entity.fillReceiptTakerToken, event.block.timestamp)

  // Obtain the order hash and use it as the order entity ID.
  const orderId = event.params.orderHash.toHex()
  // Load the existing Order entity or create a new one if none exists.
  let orderEntity = OrderEntity.load(orderId)
  if (orderEntity == null) {
    orderEntity = new OrderEntity(orderId)
    orderEntity.orderStatus = OrderStatus.Normal
    orderEntity.maker = event.params.maker
    orderEntity.makerToken = event.params.fillReceipt.makerToken
    orderEntity.takerToken = event.params.fillReceipt.takerToken
    orderEntity.firstFilledTime = event.block.timestamp
    orderEntity.cancelledTime = BigInt.fromI32(0)
    // Establish the relationship to the first LimitOrderFilled entity under the same orderHash.
    orderEntity.limitOrderFilledId = new Array<string>(0)
    log.info('Order entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), orderEntity.id])
  }
  orderEntity.lastFilledTime = event.block.timestamp
  // Establish the relationship of this LimitOrderFilled entity within the same orderHash context.
  const limitOrderFilledArray = orderEntity.limitOrderFilledId
  limitOrderFilledArray.push(eventId)
  orderEntity.limitOrderFilledId = limitOrderFilledArray
  // If the order is fully filled at this time.
  if (event.params.fillReceipt.remainingAmount.equals(BigInt.fromI32(0))) {
    orderEntity.orderStatus = OrderStatus.FullyFilled
    log.info('Order is filled all, the order hash: {}.', [orderEntity.id])
  }
  // The entity should be saved after configuration.
  orderEntity.save()

  // Load the existing LimitOrderFilled entity or create a new one if none exists.
  let limitOrderEntity = LimitOrderFilledEntity.load(eventId)
  if (limitOrderEntity == null) {
    limitOrderEntity = new LimitOrderFilledEntity(eventId)
    limitOrderEntity.orderId = orderId
    limitOrderEntity.limitOrderFilledType = LimitOrderTypes.ByProtocol
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
    // Event parameters for relayerTakerTokenProfitFee and relayerTakerTokenProfitFee related to LimitOrder on the Mainnet.
    limitOrderEntity.takerTokenProfit = event.params.relayerTakerTokenProfit
    limitOrderEntity.takerTokenProfitFee = event.params.relayerTakerTokenProfitFee
    // Event parameter for takerTokenProfitBackToMaker is exclusive to Arbitrum and Goerli.
    limitOrderEntity.takerTokenProfitBackToMaker = BigInt.fromI32(0)
    // Event parameter for recipient is exclusive to the LimitOrderFilledByTrader event.
    limitOrderEntity.recipient = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.blockNumber = event.block.number
    limitOrderEntity.blockTimestamp = event.block.timestamp
    limitOrderEntity.transactionHash = event.transaction.hash
  }
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), limitOrderEntity.id])
  // The entity should be saved after configuration.
  limitOrderEntity.save()
}

// Function to handle the occurrence of the LimitOrderFilledByProtocol event.
export function handleLimitOrderFilledByProtocol(event: LimitOrderFilledByProtocolEvent): void {
  // Store the data from this LimitOrderFilledByProtocol event.
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
  // Event parameters for takerTokenProfit, takerTokenProfitFee, and takerTokenProfitBackToMaker related to LimitOrder on Arbitrum and Goerli.
  entity.takerTokenProfit = event.params.takerTokenProfit
  entity.takerTokenProfitFee = event.params.takerTokenProfitFee
  entity.takerTokenProfitBackToMaker = event.params.takerTokenProfitBackToMaker

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), entity.id])
  // The entity should be saved after configuration.
  entity.save()

  // Store the token data from this LimitOrderFilledByProtocol event.
  addTradedToken(entity.fillReceiptMakerToken, event.block.timestamp)
  addTradedToken(entity.fillReceiptTakerToken, event.block.timestamp)

  // Obtain the order hash and use it as the order entity ID.
  const orderId = event.params.orderHash.toHex()
  // Load the existing Order entity or create a new one if none exists.
  let orderEntity = OrderEntity.load(orderId)
  if (orderEntity == null) {
    orderEntity = new OrderEntity(orderId)
    orderEntity.orderStatus = OrderStatus.Normal
    orderEntity.maker = event.params.maker
    orderEntity.makerToken = event.params.fillReceipt.makerToken
    orderEntity.takerToken = event.params.fillReceipt.takerToken
    orderEntity.firstFilledTime = event.block.timestamp
    orderEntity.cancelledTime = BigInt.fromI32(0)
    // Establish the relationship to the first LimitOrderFilled entity under the same orderHash.
    orderEntity.limitOrderFilledId = new Array<string>(0)
    log.info('Order entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), orderEntity.id])
  }
  orderEntity.lastFilledTime = event.block.timestamp
  // Establish the relationship of this LimitOrderFilled entity within the same orderHash context.
  const limitOrderFilledArray = orderEntity.limitOrderFilledId
  limitOrderFilledArray.push(eventId)
  orderEntity.limitOrderFilledId = limitOrderFilledArray
  // If the order is fully filled at this time.
  if (event.params.fillReceipt.remainingAmount.equals(BigInt.fromI32(0))) {
    orderEntity.orderStatus = OrderStatus.FullyFilled
    log.info('Order is filled all, the order hash: {}.', [orderEntity.id])
  }
  // The entity should be saved after configuration.
  orderEntity.save()

  // Load the existing LimitOrderFilled entity or create a new one if none exists.
  let limitOrderEntity = LimitOrderFilledEntity.load(eventId)
  if (limitOrderEntity == null) {
    limitOrderEntity = new LimitOrderFilledEntity(eventId)
    limitOrderEntity.orderId = orderId
    limitOrderEntity.limitOrderFilledType = LimitOrderTypes.ByProtocol
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
    // Event parameters of takerTokenProfit, takerTokenProfitFee for LimitOrder on Arbitrum and Goerli.
    limitOrderEntity.takerTokenProfit = event.params.takerTokenProfit
    limitOrderEntity.takerTokenProfitFee = event.params.takerTokenProfitFee
    limitOrderEntity.takerTokenProfitBackToMaker = event.params.takerTokenProfitBackToMaker
    // Event parameter for recipient is exclusive to the LimitOrderFilledByTrader event.
    limitOrderEntity.recipient = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.blockNumber = event.block.number
    limitOrderEntity.blockTimestamp = event.block.timestamp
    limitOrderEntity.transactionHash = event.transaction.hash
  }
  log.info('LimitOrderFilledByProtocol entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), limitOrderEntity.id])
  // The entity should be saved after configuration.
  limitOrderEntity.save()
}

// Function to handle the occurrence of the LimitOrderFilledByTrader event.
export function handleLimitOrderFilledByTrader(event: LimitOrderFilledByTraderEvent): void {
  // Store the data from this LimitOrderFilledByTrader event.
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
  // The entity should be saved after configuration.
  entity.save()

  // Store the token data from this LimitOrderFilledByTrader event.
  addTradedToken(entity.fillReceiptMakerToken, event.block.timestamp)
  addTradedToken(entity.fillReceiptTakerToken, event.block.timestamp)

  // Obtain the order hash and use it as the order entity ID.
  const orderId = event.params.orderHash.toHex()
  // Load the existing Order entity or create a new one if none exists.
  let orderEntity = OrderEntity.load(orderId)
  if (orderEntity == null) {
    orderEntity = new OrderEntity(orderId)
    orderEntity.orderStatus = OrderStatus.Normal
    orderEntity.maker = event.params.maker
    orderEntity.makerToken = event.params.fillReceipt.makerToken
    orderEntity.takerToken = event.params.fillReceipt.takerToken
    orderEntity.firstFilledTime = event.block.timestamp
    orderEntity.cancelledTime = BigInt.fromI32(0)
    // Establish the relationship to the first LimitOrderFilled entity under the same orderHash.
    orderEntity.limitOrderFilledId = new Array<string>(0)
    log.info('Order entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), orderEntity.id])
  }
  orderEntity.lastFilledTime = event.block.timestamp
  // Establish the relationship of this LimitOrderFilled entity within the same orderHash context.
  const limitOrderFilledArray = orderEntity.limitOrderFilledId
  limitOrderFilledArray.push(eventId)
  orderEntity.limitOrderFilledId = limitOrderFilledArray
  // If the order is fully filled at this time.
  if (event.params.fillReceipt.remainingAmount.equals(BigInt.fromI32(0))) {
    orderEntity.orderStatus = OrderStatus.FullyFilled
    log.info('Order is filled all, the order hash: {}.', [orderEntity.id])
  }
  // The entity should be saved after configuration.
  orderEntity.save()

  // Load the existing LimitOrderFilled entity or create a new one if none exists.
  let limitOrderEntity = LimitOrderFilledEntity.load(eventId)
  if (limitOrderEntity == null) {
    limitOrderEntity = new LimitOrderFilledEntity(eventId)
    limitOrderEntity.orderId = orderId
    limitOrderEntity.limitOrderFilledType = LimitOrderTypes.ByTrader
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
    // Event parameters for relayer, profitRecipient, relayerTakerTokenProfit,
    // relayerTakerTokenProfitFee are exclusive to the
    // LimitOrderFilledByProtocol event.
    limitOrderEntity.relayer = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.profitRecipient = Address.fromString('0x0000000000000000000000000000000000000000') as Bytes
    limitOrderEntity.takerTokenProfit = BigInt.fromI32(0)
    limitOrderEntity.takerTokenProfitFee = BigInt.fromI32(0)
    limitOrderEntity.takerTokenProfitBackToMaker = BigInt.fromI32(0)

    limitOrderEntity.blockNumber = event.block.number
    limitOrderEntity.blockTimestamp = event.block.timestamp
    limitOrderEntity.transactionHash = event.transaction.hash
  }
  log.info('LimitOrderFilledByTrader entity created at transaction hash: {}, this entity id: {}.', [event.transaction.hash.toHex(), limitOrderEntity.id])
  // The entity should be saved after configuration.
  limitOrderEntity.save()
}

// Function to handle the occurrence of the OrderCancelled event.
export function handleOrderCancelled(event: OrderCancelledEvent): void {
  // Store the data from this OrderCancelled event.
  const eventId = getEventID(event)
  const entity = new OrderCancelledEntity(eventId)
  entity.orderHash = event.params.orderHash
  entity.maker = event.params.maker
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  // The entity should be saved after configuration.
  entity.save()

  // Obtain the order entity and mark it as canceled by the maker.
  let orderEntity = OrderEntity.load(event.params.orderHash.toHex())
  if (orderEntity != null) {
    orderEntity.orderStatus = 'Cancelled'
    orderEntity.cancelledTime = event.block.timestamp
    log.info('Order cancelled by maker at transaction hash: {}.', [event.transaction.hash.toHex()])
    // The entity should be saved after configuration.
    orderEntity.save()
  }
}
