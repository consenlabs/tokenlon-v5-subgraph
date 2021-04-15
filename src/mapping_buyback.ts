import { Address, BigInt, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { BuyBack as BuyBackEvent, DistributeLon as DistributeLonEvent, MintLon as MintLonEvent, SetFeeToken as SetFeeTokenEvent, EnableFeeToken as EnableFeeTokenEvent } from "../generated/RewardDistributor/RewardDistributor"
import { BuyBack, DistributeLon, MintLon, BuyBackDayData, BuyBackTotal, StakedChange, SetFeeToken, EnableFeeToken, FeeToken } from "../generated/schema"
import { ZERO, ZERO_BD, ONE, LonStakingContract, RewardDistributorContract, LON_ADDRESS, LON_STAKING_ADDRESS, updateStakedData, getBuyBack, getUser, REWARD_DISTRIBUTOR_ADDRESS, getScaleIndex } from './helper'
const START_TIMESTAMP = 1617206400

export function handleBuyBack(event: BuyBackEvent): void {

  // update buyback
  let entity = getBuyBack(event)
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

  // update buyback day data
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let buyBackDayID = dayID.toString()
  let treasuryAmount = event.params.treasuryAmount
  let lonStakingAmount = event.params.lonStakingAmount

  // update buyback total
  let buyBackTotal = BuyBackTotal.load("1")
  if (buyBackTotal == null) {
    buyBackTotal = new BuyBackTotal("1")
    buyBackTotal.totalTreasuryAmount = ZERO
    buyBackTotal.totalLonStakingAmount = ZERO
    buyBackTotal.totalMintedAmount = ZERO
    buyBackTotal.txCount = ZERO
    buyBackTotal.scaleIndex = ZERO_BD
    buyBackTotal.lastUpdatedAt = 0
  }

  let scaleIndex = getScaleIndex()
  if (buyBackTotal.lastUpdatedAt == 0) {
    buyBackTotal.lastUpdatedAt = START_TIMESTAMP
  }
  buyBackTotal.txCount = buyBackTotal.txCount.plus(ONE)
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
    buyBackDayData.scaleIndex = ZERO_BD
    buyBackDayData.lastUpdatedAt = 0
  }
  buyBackDayData.txCount = buyBackDayData.txCount.plus(ONE)
  buyBackDayData.scaleIndex = scaleIndex
  buyBackDayData.lastUpdatedAt = timestamp
  buyBackDayData.dailyTreasuryAmount = buyBackDayData.dailyTreasuryAmount.plus(treasuryAmount)
  buyBackDayData.dailyLonStakingAmount = buyBackDayData.dailyLonStakingAmount.plus(lonStakingAmount)
  buyBackDayData.save()

  // add buyback if the fee token is Lon
  let buyBack = getBuyBack(event)
  if (buyBack.gasPrice.equals(ZERO)) {
    buyBack.from = event.transaction.from as Bytes
    buyBack.to = event.transaction.to as Bytes
    buyBack.transactionHash = event.transaction.hash.toHex()
    buyBack.blockNumber = event.block.number
    buyBack.logIndex = event.logIndex
    buyBack.eventAddr = event.address
    buyBack.gasPrice = event.transaction.gasPrice
    buyBack.feeToken = Address.fromString(LON_ADDRESS)
    buyBack.feeTokenAmount = event.params.treasuryAmount.plus(event.params.lonStakingAmount)
    buyBack.swappedLonAmount = ZERO
    buyBack.LFactor = ZERO
    buyBack.RFactor = ZERO
    buyBack.minBuy = ZERO
    buyBack.maxBuy = ZERO
    buyBack.timestamp = event.block.timestamp.toI32()

    let feeTokens = RewardDistributorContract.try_feeTokens(Address.fromString(LON_ADDRESS))
    if (!feeTokens.reverted) {
      // struct FeeToken {
      //   uint8 exchangeIndex;
      //   uint8 LFactor;
      //   uint8 RFactor;
      //   uint32 lastTimeBuyback;
      //   bool enable;
      //   uint256 minBuy;
      //   uint256 maxBuy;
      //   address[] path;
      // }
      buyBack.LFactor = BigInt.fromI32(feeTokens.value.value1)
      buyBack.RFactor = BigInt.fromI32(feeTokens.value.value2)
      buyBack.minBuy = feeTokens.value.value5
      buyBack.maxBuy = feeTokens.value.value6
    }

    buyBack.save()
  }

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
  entity.scaleIndex = scaleIndex
  entity.save()

  // update staked change
  let stakedChange = StakedChange.load(txHash)
  if (stakedChange == null) {
    stakedChange = new StakedChange(txHash)
    stakedChange.stakedAmount = lonStakingAmount
    stakedChange.timestamp = 0
    stakedChange.penalty = ZERO
    stakedChange.added = true
    stakedChange.save()
  }

  log.info(entity.transactionHash, null)

  updateStakedData(event)

  let user = getUser(event.transaction.from, event.block.timestamp.toI32())
  user.buyBackCount += 1
  user.lastSeen = event.block.timestamp.toI32()
  user.save()
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
