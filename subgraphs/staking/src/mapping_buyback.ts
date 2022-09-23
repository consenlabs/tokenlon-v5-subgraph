import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'
import { BuyBack as BuyBackEvent, DistributeLon as DistributeLonEvent, MintLon as MintLonEvent, SetFeeToken as SetFeeTokenEvent, EnableFeeToken as EnableFeeTokenEvent } from '../generated/RewardDistributor/RewardDistributor'
import { BuyBackDayData } from '../generated/schema'
import { ZERO, ZERO_BD, ONE, START_TIMESTAMP, RewardDistributorContract, LON_ADDRESS, updateStakedData, getBuyBack, getScaleIndex, getDistributeLon, getStakedChange, getBuyBackTotal, getFeeToken, getMintLon, getEnableFeeToken, getSetFeeToken } from './helper'

export function handleBuyBack(event: BuyBackEvent): void {
  // update buyback
  const entity = getBuyBack(event)!
  entity.gasPrice = event.transaction.gasPrice
  entity.feeToken = event.params.feeToken
  entity.feeTokenAmount = event.params.feeTokenAmount
  entity.swappedLonAmount = event.params.swappedLonAmount
  entity.LFactor = event.params.LFactor
  entity.RFactor = event.params.RFactor
  entity.minBuy = event.params.minBuy
  entity.maxBuy = event.params.maxBuy
  entity.timestamp = event.block.timestamp.toI32()

  log.info('BuyBackEvent transaction hash: {}', [entity.transactionHash])
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
  const buyBackTotal = getBuyBackTotal()!

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
  const buyBack = getBuyBack(event)!
  if (buyBack.gasPrice.equals(ZERO)) {
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
      buyBack.LFactor = BigInt.fromI32(feeTokens.value.value1)
      buyBack.RFactor = BigInt.fromI32(feeTokens.value.value2)
      buyBack.minBuy = feeTokens.value.value5
      buyBack.maxBuy = feeTokens.value.value6
    }

    buyBack.save()
  }

  // update distribute lon
  const entity = getDistributeLon(event)!
  entity.treasuryAmount = event.params.treasuryAmount
  entity.lonStakingAmount = event.params.lonStakingAmount
  entity.scaleIndex = scaleIndex
  entity.save()

  // update staked change
  const stakedChange = getStakedChange(event)!
  stakedChange.stakedAmount = lonStakingAmount
  stakedChange.added = true
  stakedChange.save()

  updateStakedData(event)

  log.info('DistributeLonEvent transaction hash: {}', [entity.transactionHash])
}

export function handleMintLon(event: MintLonEvent): void {
  // update minted lon
  let txHash = event.transaction.hash.toHex()
  const mintLon = getMintLon(event)!
  mintLon.mintedAmount = event.params.mintedAmount
  mintLon.save()

  let distributeLon = getDistributeLon(event)

  // update buyback day data
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let buyBackDayID = dayID.toString()
  let mintedAmount = mintLon.mintedAmount

  let buyBackDayData = BuyBackDayData.load(buyBackDayID)
  if (buyBackDayData == null) {
    log.error("couldn't load the buyback day data in transaction: {}", [txHash])
  } else {
    buyBackDayData.dailyMintedAmount = buyBackDayData.dailyMintedAmount.plus(mintedAmount)
    buyBackDayData.save()
  }

  // update buyback total
  const buyBackTotal = getBuyBackTotal()!
  buyBackTotal.totalMintedAmount = buyBackTotal.totalMintedAmount.plus(mintedAmount)
  buyBackTotal.save()

  log.info('MintLonEvent transaction hash: {}', [event.transaction.hash.toHex()])
}

export function handleEnableFeeToken(event: EnableFeeTokenEvent): void {
  const entity = getEnableFeeToken(event)!
  entity.feeToken = event.params.feeToken
  entity.enabled = event.params.enable
  entity.save()

  // update fee token
  const feeToken = getFeeToken(event.params.feeToken.toHex())!
  feeToken.enabled = event.params.enable
  feeToken.save()

  log.info('EnableFeeTokenEvent transaction hash: {}', [entity.transactionHash])
}

export function handleSetFeeToken(event: SetFeeTokenEvent): void {
  // update set fee token
  const entity = getSetFeeToken(event)!
  entity.feeToken = event.params.feeToken
  entity.exchangeIndex = event.params.exchangeIndex
  entity.path = event.params.path.map<Bytes>(addr => addr as Bytes)
  entity.LFactor = event.params.LFactor
  entity.RFactor = event.params.RFactor
  entity.minBuy = event.params.minBuy
  entity.maxBuy = event.params.maxBuy
  entity.save()

  // update fee token
  const feeToken = getFeeToken(event.params.feeToken.toHex())!
  feeToken.exchangeIndex = event.params.exchangeIndex
  feeToken.path = event.params.path.map<Bytes>(addr => addr as Bytes)
  feeToken.LFactor = event.params.LFactor
  feeToken.RFactor = event.params.RFactor
  feeToken.minBuy = event.params.minBuy
  feeToken.maxBuy = event.params.maxBuy
  feeToken.save()

  log.info('SetFeeTokenEvent transaction hash: {}', [entity.transactionHash])
}
