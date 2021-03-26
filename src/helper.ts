/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, Address } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'
import { LonStaking } from "../generated/LonStaking/LonStaking"
import { StakedDayData, StakedTotal, StakedChange } from "../generated/schema"

export const STAKING_ADDRESS = '0x085a5F35da59E1799132247AEde7f3746580E331'
export const LON_ADDRESS = '0x0712629ced85a3a62e5bca96303b8fdd06cbf8dd'
export let ZERO = BigInt.fromI32(0)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE = BigInt.fromI32(1)
export let ONE_BD = BigDecimal.fromString('1')
export let LonStakingContract = LonStaking.bind(Address.fromString(STAKING_ADDRESS))

export function updateStakedData(event: ethereum.Event): void {
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    log.info(`should log staked change first ${event.transaction.hash.toHex()}`, null)
    return
  }

  // staked total
  let stakedTotal = StakedTotal.load("1")
  if (stakedTotal == null) {
    stakedTotal = new StakedTotal("1")
    stakedTotal.totalStakedAmount = ZERO
  }

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
    stakedDayData.apy = ZERO_BD
    stakedDayData.scaleIndex = ZERO_BD
    stakedDayData.txCount = ZERO
  }

  // update staked amount
  let oriTxCount = stakedDayData.txCount
  stakedDayData.txCount = stakedDayData.txCount.plus(ONE)
  if (stakedChange.added) {
    stakedTotal.totalStakedAmount = stakedTotal.totalStakedAmount.plus(stakedChange.stakedAmount)
    stakedDayData.dailyStakedAmount = stakedDayData.dailyStakedAmount.plus(stakedChange.stakedAmount)
  } else {
    stakedTotal.totalStakedAmount = stakedTotal.totalStakedAmount.minus(stakedChange.stakedAmount)
    stakedDayData.dailyStakedAmount = stakedDayData.dailyStakedAmount.minus(stakedChange.stakedAmount)
  }

  // update apy
  let lon = LonStaking.bind(Address.fromString(LON_ADDRESS))
  let totalSupply = new BigDecimal(LonStakingContract.totalSupply())
  if (totalSupply.gt(ZERO_BD)) {
    let lonBalance = new BigDecimal(lon.balanceOf(Address.fromString(STAKING_ADDRESS)))
    let scaleIndex = lonBalance.div(totalSupply)
    let currApy = scaleIndex.minus(ONE_BD).times(BigDecimal.fromString('100'))
    stakedDayData.scaleIndex = scaleIndex
    stakedDayData.apy = stakedDayData.apy.times(new BigDecimal(oriTxCount)).plus(currApy).div(new BigDecimal(stakedDayData.txCount))
    stakedChange.scaleIndex = scaleIndex
    stakedChange.apy = currApy
  }
  stakedChange.date = timestamp
  stakedTotal.save()
  stakedChange.save()
  stakedDayData.save()
}