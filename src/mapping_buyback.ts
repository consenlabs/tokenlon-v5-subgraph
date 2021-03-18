import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { BuyBack as BuyBackEvent, DistributeLon as DistributeLonEvent, MintLon as MintLonEvent } from "../generated/RewardDistributor/RewardDistributor"
import { BuyBack, DistributeLon, MintLon, BuyBackDayData, BuyBackTotal } from "../generated/schema"

export function handleBuyBack(event: BuyBackEvent): void {

  let ZERO = BigInt.fromI32(0)
  let entity = BuyBack.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new BuyBack(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.feeTokenAmount = ZERO
    entity.swappedLonAmount = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.feeToken = event.params.feeToken
  entity.feeTokenAmount = event.params.feeTokenAmount
  entity.swappedLonAmount = event.params.swappedLonAmount
  entity.LFactor = event.params.LFactor
  entity.RFactor = event.params.RFactor
  entity.minBuy = event.params.minBuy
  entity.maxBuy = event.params.maxBuy

  log.info(entity.transactionHash, null)
  entity.save()
}

export function handleDistributeLon(event: DistributeLonEvent): void {

  let ZERO = BigInt.fromI32(0)
  let txHash = event.transaction.hash.toHex()
  let entity = DistributeLon.load(txHash)
  if (entity == null) {
    entity = new DistributeLon(txHash)
    entity.gasPrice = ZERO
    entity.treasuryAmount = ZERO
    entity.lonStakingAmount = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = txHash
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.treasuryAmount = event.params.treasuryAmount
  entity.lonStakingAmount = event.params.lonStakingAmount

  log.info(entity.transactionHash, null)
  entity.save()
}

export function handleMintLon(event: MintLonEvent): void {

  let ZERO = BigInt.fromI32(0)
  let txHash = event.transaction.hash.toHex()
  let entity = MintLon.load(txHash)
  if (entity == null) {
    entity = new MintLon(txHash)
    entity.gasPrice = ZERO
    entity.mintedAmount = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = txHash
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.mintedAmount = event.params.mintedAmount

  log.info(entity.transactionHash, null)
  entity.save()

  let distributeLon = DistributeLon.load(txHash)
  if (distributeLon == null) {
    // oops......
    log.error(`couldn't load the dristributeLon in transaction: ${txHash}`, null)
  }

  // update buyBackDayData
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let buyBackDayID = dayID.toString()
  let treasuryAmount = distributeLon.treasuryAmount
  let lonStakingAmount = distributeLon.lonStakingAmount
  let mintedAmount = entity.mintedAmount
  let buyBackDayData = BuyBackDayData.load(buyBackDayID)
  if (buyBackDayData == null) {
    buyBackDayData = new BuyBackDayData(buyBackDayID)
    buyBackDayData.date = dayStartTimestamp
    buyBackDayData.dailyTreasuryAmount = ZERO
    buyBackDayData.dailyLonStakingAmount = ZERO
    buyBackDayData.dailyMintedAmount = ZERO
    buyBackDayData.totalTreasuryAmount = ZERO
    buyBackDayData.totalLonStakingAmount = ZERO
    buyBackDayData.totalMintedAmount = ZERO
  }
  buyBackDayData.dailyTreasuryAmount = buyBackDayData.dailyTreasuryAmount.plus(treasuryAmount)
  buyBackDayData.dailyLonStakingAmount = buyBackDayData.dailyLonStakingAmount.plus(lonStakingAmount)
  buyBackDayData.dailyMintedAmount = buyBackDayData.dailyMintedAmount.plus(mintedAmount)
  buyBackDayData.totalTreasuryAmount = buyBackDayData.totalTreasuryAmount.plus(treasuryAmount)
  buyBackDayData.totalLonStakingAmount = buyBackDayData.totalLonStakingAmount.plus(lonStakingAmount)
  buyBackDayData.totalMintedAmount = buyBackDayData.totalMintedAmount.plus(mintedAmount)
  // update apy
  buyBackDayData.save()
  // update buyBackTotal
  let buyBackTotal = BuyBackTotal.load("1")
  if (buyBackTotal == null) {
    buyBackTotal = new BuyBackTotal("1")
    buyBackTotal.totalTreasuryAmount = ZERO
    buyBackTotal.totalLonStakingAmount = ZERO
    buyBackTotal.totalMintedAmount = ZERO
  }
  buyBackTotal.totalTreasuryAmount = buyBackTotal.totalTreasuryAmount.plus(treasuryAmount)
  buyBackTotal.totalLonStakingAmount = buyBackTotal.totalLonStakingAmount.plus(lonStakingAmount)
  buyBackTotal.totalMintedAmount = buyBackTotal.totalMintedAmount.plus(mintedAmount)
  // update apy
  buyBackTotal.save()
}