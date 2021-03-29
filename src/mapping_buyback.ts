import { Address, BigInt, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { BuyBack as BuyBackEvent, DistributeLon as DistributeLonEvent, MintLon as MintLonEvent, SetFeeToken as SetFeeTokenEvent, EnableFeeToken as EnableFeeTokenEvent } from "../generated/RewardDistributor/RewardDistributor"
import { LonStaking } from "../generated/LonStaking/LonStaking"
import { BuyBack, DistributeLon, MintLon, BuyBackDayData, BuyBackTotal, StakedChange, SetFeeToken, EnableFeeToken, FeeToken } from "../generated/schema"
import { ZERO, ZERO_BD, ONE, updateStakedData, LonStakingContract, LON_ADDRESS, STAKING_ADDRESS } from './helper'
const START_TIMESTAMP = 1617206400

export function handleBuyBack(event: BuyBackEvent): void {

  // update buyback
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
  entity.timestamp = event.block.timestamp.toI32()

  log.info(entity.transactionHash, null)
  entity.save()
}

export function handleDistributeLon(event: DistributeLonEvent): void {

  // update distribute lon
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
  entity.timestamp = event.block.timestamp.toI32()

  log.info(entity.transactionHash, null)
  entity.save()

  // update buyback day data
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let buyBackDayID = dayID.toString()
  let treasuryAmount = entity.treasuryAmount
  let lonStakingAmount = entity.lonStakingAmount

  // update buyback total
  let buyBackTotal = BuyBackTotal.load("1")
  if (buyBackTotal == null) {
    buyBackTotal = new BuyBackTotal("1")
    buyBackTotal.totalTreasuryAmount = ZERO
    buyBackTotal.totalLonStakingAmount = ZERO
    buyBackTotal.totalMintedAmount = ZERO
    buyBackTotal.txCount = ZERO
    buyBackTotal.apy = ZERO_BD
    buyBackTotal.currApy = ZERO_BD
    buyBackTotal.scaleIndex = ZERO_BD
    buyBackTotal.lastUpdatedAt = 0
  }

  let lon = LonStaking.bind(Address.fromString(LON_ADDRESS))
  let totalSupply = new BigDecimal(LonStakingContract.totalSupply())
  let lonBalance = ZERO_BD
  let scaleIndex = ZERO_BD
  if (totalSupply.gt(ZERO_BD)) {
    lonBalance = new BigDecimal(lon.balanceOf(Address.fromString(STAKING_ADDRESS)))
    scaleIndex = lonBalance.div(totalSupply)
  }
  if (buyBackTotal.lastUpdatedAt == 0) {
    buyBackTotal.lastUpdatedAt = START_TIMESTAMP
  }
  let oriTxCount = buyBackTotal.txCount
  let timeInterval = new BigDecimal(BigInt.fromI32(timestamp - buyBackTotal.lastUpdatedAt))
  let scaleIndexDiff = scaleIndex.minus(buyBackTotal.scaleIndex)
  let currApy = scaleIndexDiff.div(timeInterval).times(BigDecimal.fromString('86400')).times(BigDecimal.fromString('365')).times(BigDecimal.fromString('100'))
  buyBackTotal.txCount = buyBackTotal.txCount.plus(ONE)
  buyBackTotal.currApy = currApy
  buyBackTotal.apy = buyBackTotal.apy.times(new BigDecimal(oriTxCount)).plus(currApy).div(new BigDecimal(buyBackTotal.txCount))
  buyBackTotal.scaleIndex = scaleIndex
  buyBackTotal.lastUpdatedAt = timestamp
  buyBackTotal.totalTreasuryAmount = buyBackTotal.totalTreasuryAmount.plus(treasuryAmount)
  buyBackTotal.totalLonStakingAmount = buyBackTotal.totalLonStakingAmount.plus(lonStakingAmount)
  buyBackTotal.save()

  let buyBackDayData = BuyBackDayData.load(buyBackDayID)
  if (buyBackDayData == null) {
    buyBackDayData = new BuyBackDayData(buyBackDayID)
    buyBackDayData.date = dayStartTimestamp
    buyBackDayData.dailyTreasuryAmount = ZERO
    buyBackDayData.dailyLonStakingAmount = ZERO
    buyBackDayData.dailyMintedAmount = ZERO
    buyBackDayData.txCount = ZERO
    buyBackDayData.apy = ZERO_BD
    buyBackDayData.currApy = ZERO_BD
    buyBackDayData.scaleIndex = ZERO_BD
    buyBackDayData.lastUpdatedAt = 0
  }
  oriTxCount = buyBackDayData.txCount
  buyBackDayData.txCount = buyBackDayData.txCount.plus(ONE)
  buyBackDayData.currApy = currApy
  buyBackDayData.apy = buyBackDayData.apy.times(new BigDecimal(oriTxCount)).plus(currApy).div(new BigDecimal(buyBackDayData.txCount))
  buyBackDayData.scaleIndex = scaleIndex
  buyBackDayData.lastUpdatedAt = timestamp
  buyBackDayData.dailyTreasuryAmount = buyBackDayData.dailyTreasuryAmount.plus(treasuryAmount)
  buyBackDayData.dailyLonStakingAmount = buyBackDayData.dailyLonStakingAmount.plus(lonStakingAmount)
  buyBackDayData.save()

  // update staked change
  let stakedChange = StakedChange.load(txHash)
  if (stakedChange == null) {
    stakedChange = new StakedChange(txHash)
    stakedChange.stakedAmount = lonStakingAmount
    stakedChange.date = 0
    stakedChange.penalty = ZERO
    stakedChange.added = true
    stakedChange.save()
  }

  updateStakedData(event)
}

export function handleMintLon(event: MintLonEvent): void {

  // update minted lon
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
  entity.timestamp = event.block.timestamp.toI32()

  log.info(entity.transactionHash, null)
  entity.save()

  let distributeLon = DistributeLon.load(txHash)
  if (distributeLon == null) {
    // oops......
    log.error(`couldn't load the dristributeLon in transaction: ${txHash}`, null)
  }

  // update buyback day data
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let buyBackDayID = dayID.toString()
  let mintedAmount = entity.mintedAmount

  let buyBackDayData = BuyBackDayData.load(buyBackDayID)
  if (buyBackDayData == null) {
    log.error(`couldn't load the buyback day data in transaction: ${txHash}`, null)
  }
  buyBackDayData.dailyMintedAmount = buyBackDayData.dailyMintedAmount.plus(mintedAmount)
  buyBackDayData.save()

  // update buyback total
  let buyBackTotal = BuyBackTotal.load("1")
  if (buyBackTotal == null) {
    log.error(`couldn't load the buyback total in transaction: ${txHash}`, null)
  }
  buyBackTotal.totalMintedAmount = buyBackTotal.totalMintedAmount.plus(mintedAmount)
  buyBackTotal.save()
}

function getFeeToken(address: string): FeeToken | null {
  let feeToken = FeeToken.load(address)
  if (feeToken == null) {
    feeToken = new FeeToken(address)
    feeToken.exchangeIndex = ZERO
    feeToken.path = []
    feeToken.LFactor = ZERO
    feeToken.RFactor = ZERO
    feeToken.minBuy = ZERO
    feeToken.maxBuy = ZERO
    feeToken.enabled = false
  }
  return feeToken
}

export function handleEnableFeeToken(event: EnableFeeTokenEvent): void {

  // update set fee token
  let key = BigInt.fromUnsignedBytes(event.transaction.hash)
  key = key.plus(event.logIndex)
  let entity = EnableFeeToken.load(key.toHex())
  if (entity == null) {
    entity = new EnableFeeToken(key.toHex())
    entity.gasPrice = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.feeToken = event.params.feeToken
  entity.enabled = event.params.enable
  entity.timestamp = event.block.timestamp.toI32()
  entity.save()

  // update fee token
  let feeToken = getFeeToken(event.params.feeToken.toHex())
  feeToken.enabled = event.params.enable
  feeToken.save()

  log.info(entity.transactionHash, null)
}

export function handleSetFeeToken(event: SetFeeTokenEvent): void {

  // update set fee token
  let key = BigInt.fromUnsignedBytes(event.transaction.hash)
  key = key.plus(event.logIndex)
  let entity = SetFeeToken.load(key.toHex())
  if (entity == null) {
    entity = new SetFeeToken(key.toHex())
    entity.gasPrice = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.feeToken = event.params.feeToken
  entity.exchangeIndex = event.params.exchangeIndex
  entity.path = event.params.path as Array<Bytes>
  entity.LFactor = event.params.LFactor
  entity.RFactor = event.params.RFactor
  entity.minBuy = event.params.minBuy
  entity.maxBuy = event.params.maxBuy
  entity.timestamp = event.block.timestamp.toI32()
  entity.save()

  // update fee token
  let feeToken = getFeeToken(event.params.feeToken.toHex())
  feeToken.exchangeIndex = event.params.exchangeIndex
  feeToken.path = event.params.path as Array<Bytes>
  feeToken.LFactor = event.params.LFactor
  feeToken.RFactor = event.params.RFactor
  feeToken.minBuy = event.params.minBuy
  feeToken.maxBuy = event.params.maxBuy
  feeToken.save()

  log.info(entity.transactionHash, null)
}