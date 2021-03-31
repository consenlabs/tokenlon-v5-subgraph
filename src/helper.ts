/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, Address, Bytes } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'
import { LonStaking } from "../generated/LonStaking/LonStaking"
import { StakedDayData, StakedTotal, StakedChange, BuyBackTotal } from "../generated/schema"

export const STAKING_ADDRESS = '0xf88506b0f1d30056b9e5580668d5875b9cd30f23'
export const LON_ADDRESS = '0x0000000000095413afc295d19edeb1ad7b71c952'
export let ZERO = BigInt.fromI32(0)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE = BigInt.fromI32(1)
export let ONE_BD = BigDecimal.fromString('1')
export let LonStakingContract = LonStaking.bind(Address.fromString(STAKING_ADDRESS))
export let ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
export let ETH_ADDRESS = Address.fromString('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
export let WETH_ADDRESS = Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")

export function updateStakedData(event: ethereum.Event): void {
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    log.info(`should log staked change first ${event.transaction.hash.toHex()}`, null)
    return
  }

  // staked total, TODO: minus penalty?
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
  stakedChange.date = timestamp
  stakedTotal.save()
  stakedChange.save()
  stakedDayData.save()
}

export let isETH = (assetAddr: Bytes): boolean => {
  return (assetAddr == ZERO_ADDRESS) || (assetAddr == ETH_ADDRESS) || (assetAddr == WETH_ADDRESS)
}