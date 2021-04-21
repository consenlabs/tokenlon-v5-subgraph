/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, Address, Bytes } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'
import { LonStaking } from "../generated/LonStaking/LonStaking"
import { RewardDistributor } from "../generated/RewardDistributor/RewardDistributor"
import { StakingRecord, StakedDayData, StakedTotal, StakedChange, BuyBack } from "../generated/schema"

export const LON_STAKING_ADDRESS = '0xf88506b0f1d30056b9e5580668d5875b9cd30f23'
export const REWARD_DISTRIBUTOR_ADDRESS = '0xbF1C2c17CC77e7Dec3466B96F46f93c09f02aB07'
export const LON_ADDRESS = '0x0000000000095413afc295d19edeb1ad7b71c952'
export let ZERO = BigInt.fromI32(0)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE = BigInt.fromI32(1)
export let ONE_BD = BigDecimal.fromString('1')
export let LonStakingContract = LonStaking.bind(Address.fromString(LON_STAKING_ADDRESS))
export let RewardDistributorContract = RewardDistributor.bind(Address.fromString(REWARD_DISTRIBUTOR_ADDRESS))
export let ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
export let ETH_ADDRESS = Address.fromString('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
export let WETH_ADDRESS = Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
export const StakeType_Staked = 1
export const StakeType_Cooldown = 2
export const StakeType_Redeem = 3
export const START_TIMESTAMP = 1617206400

export function getStakedTotal(): StakedTotal | null {
  let stakedTotal = StakedTotal.load("1")
  if (stakedTotal == null) {
    stakedTotal = new StakedTotal("1")
    stakedTotal.totalStakedAmount = ZERO
    stakedTotal.scaleIndex = ZERO_BD
    stakedTotal.txCount = ZERO
  }
  return stakedTotal
}

export function updateStakedData(event: ethereum.Event): void {
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    log.info(`should log staked change first ${event.transaction.hash.toHex()}`, null)
    return
  }

  let stakedTotal = getStakedTotal()

  // staked day data
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let stakedDayID = dayID.toString()
  let stakedDayData = StakedDayData.load(stakedDayID)
  if (stakedDayData == null) {
    stakedDayData = new StakedDayData(stakedDayID)
    stakedDayData.date = dayStartTimestamp
    stakedDayData.dailyStakedAmount = ZERO
    stakedDayData.penalty = ZERO
  }

  // update staked amount
  if (stakedChange.added) {
    stakedTotal.totalStakedAmount = stakedTotal.totalStakedAmount.plus(stakedChange.stakedAmount)
    stakedDayData.dailyStakedAmount = stakedDayData.dailyStakedAmount.plus(stakedChange.stakedAmount)
  } else {
    stakedTotal.totalStakedAmount = stakedTotal.totalStakedAmount.minus(stakedChange.stakedAmount)
    stakedDayData.dailyStakedAmount = stakedDayData.dailyStakedAmount.minus(stakedChange.stakedAmount)
  }
  let scaleIndex = getScaleIndex()
  stakedTotal.scaleIndex = scaleIndex
  stakedChange.timestamp = timestamp
  stakedTotal.save()
  stakedChange.save()
  stakedDayData.save()
  return
}

export let isETH = (assetAddr: Bytes): boolean => {
  return (assetAddr == ZERO_ADDRESS) || (assetAddr == ETH_ADDRESS) || (assetAddr == WETH_ADDRESS)
}

export const getBuyBack = (event: ethereum.Event): BuyBack | null => {
  let entity = BuyBack.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new BuyBack(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.feeTokenAmount = ZERO
    entity.swappedLonAmount = ZERO
  }
  return entity
}

export const getStakingRecord = (event: ethereum.Event): StakingRecord | null => {
  let entity = StakingRecord.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new StakingRecord(event.transaction.hash.toHex())
    entity.transactionHash = event.transaction.hash.toHex()
    entity.blockNumber = event.block.number
    entity.logIndex = event.logIndex
    entity.timestamp = event.block.timestamp.toI32()
    entity.amount = ZERO
    entity.penalty = ZERO
    entity.share = ZERO
    entity.redeem = false
    entity.cooldownSeconds = ZERO
    entity.cooldownDate = 0
  }
  return entity
}

export const getScaleIndex = (): BigDecimal => {
  let lon = LonStaking.bind(Address.fromString(LON_ADDRESS))
  let totalSupply = new BigDecimal(LonStakingContract.totalSupply())
  let lonBalance = ZERO_BD
  let scaleIndex = ZERO_BD
  if (totalSupply.gt(ZERO_BD)) {
    lonBalance = new BigDecimal(lon.balanceOf(Address.fromString(LON_STAKING_ADDRESS)))
    scaleIndex = lonBalance.div(totalSupply)
  }
  return scaleIndex
}