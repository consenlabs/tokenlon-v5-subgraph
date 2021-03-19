import { Bytes, ethereum, Address, BigDecimal } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { Staked as StakedEvent, Redeem as RedeemEvent, LonStaking } from "../generated/LonStaking/LonStaking"
import { Staked, Redeem, StakedDayData, StakedTotal, StakedChange } from "../generated/schema"
import { STAKING_ADDRESS, ZERO, ZERO_BD } from './helper'

export function handleStaked(event: StakedEvent): void {

  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    stakedChange = new StakedChange(event.transaction.hash.toHex())
    stakedChange.stakedAmount = event.params.amount
    stakedChange.added = true
    stakedChange.save()
  }

  let entity = Staked.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Staked(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.amount = ZERO
    entity.share = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.share = event.params.share

  log.info(entity.transactionHash, null)
  entity.save()

  updateStakedDayData(event)
  updateStakedTotal(event)
}

export function handleRedeem(event: RedeemEvent): void {

  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    stakedChange = new StakedChange(event.transaction.hash.toHex())
    stakedChange.stakedAmount = event.params.amount
    stakedChange.added = false
    stakedChange.save()
  }

  let entity = Redeem.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Redeem(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.amount = ZERO
    entity.share = ZERO
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.share = event.params.share

  log.info(entity.transactionHash, null)
  entity.save()

  updateStakedDayData(event)
  updateStakedTotal(event)
}

function updateStakedDayData(event: ethereum.Event): void {
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    log.error(`should log staked change first ${event.transaction.hash.toHex()}`, null)
    return
  }
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let stakedDayID = dayID.toString()
  let stakedDayData = StakedDayData.load(stakedDayID)
  if (stakedDayData == null) {
    stakedDayData = new StakedDayData(stakedDayID)
    stakedDayData.date = dayStartTimestamp
    stakedDayData.dailyStakedAmount = ZERO
    stakedDayData.totalStakedAmount = ZERO
    stakedDayData.apy = ZERO_BD
  }
  let lonStaking = LonStaking.bind(Address.fromString(STAKING_ADDRESS))
  if (stakedChange.added) {
    stakedDayData.dailyStakedAmount = stakedDayData.dailyStakedAmount.plus(stakedChange.stakedAmount)
    stakedDayData.totalStakedAmount = stakedDayData.totalStakedAmount.plus(stakedChange.stakedAmount)
  } else {
    stakedDayData.dailyStakedAmount = stakedDayData.dailyStakedAmount.minus(stakedChange.stakedAmount)
    stakedDayData.totalStakedAmount = stakedDayData.totalStakedAmount.minus(stakedChange.stakedAmount)
  }
  let apy = BigDecimal.fromString(lonStaking.scaleIndex().toString())
  stakedDayData.apy = apy.div(BigDecimal.fromString('100'))
  stakedDayData.save()
}

function updateStakedTotal(event: ethereum.Event): void {
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    log.error(`should log staked change first ${event.transaction.hash.toHex()}`, null)
    return
  }
  let stakedTotal = StakedTotal.load("1")
  if (stakedTotal == null) {
    stakedTotal = new StakedTotal("1")
    stakedTotal.totalStakedAmount = ZERO
  }
  if (stakedChange.added) {
    stakedTotal.totalStakedAmount = stakedTotal.totalStakedAmount.plus(stakedChange.stakedAmount)
  } else {
    stakedTotal.totalStakedAmount = stakedTotal.totalStakedAmount.minus(stakedChange.stakedAmount)
  }
  stakedTotal.save()
}