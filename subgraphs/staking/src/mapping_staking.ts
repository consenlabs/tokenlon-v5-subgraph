import { Bytes } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { Staked as StakedEvent, Redeem as RedeemEvent, Cooldown as CooldownEvent } from "../generated/LonStaking/LonStaking"
import { Staked, Redeem, StakedChange, Cooldown } from "../generated/schema"
import { ZERO, ONE, updateStakedData, getStakedTotal, LonStakingContract, getStakingRecord, StakeType_Staked, StakeType_Cooldown, StakeType_Redeem } from './helper'

export function handleStaked(event: StakedEvent): void {

  // update staked change
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    stakedChange = new StakedChange(event.transaction.hash.toHex())
    stakedChange.stakedAmount = event.params.amount
    stakedChange.timestamp = 0
    stakedChange.penalty = ZERO
    stakedChange.added = true
    stakedChange.save()
  }

  // update staked
  let dayID = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  let entity = Staked.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Staked(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.amount = ZERO
    entity.share = ZERO
    entity.timestamp = 0
    entity.date = 0
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
  entity.timestamp = event.block.timestamp.toI32()
  entity.date = dayStartTimestamp

  log.info(entity.transactionHash, null)
  entity.save()

  let stakedTotal = getStakedTotal()
  stakedTotal.txCount = stakedTotal.txCount.plus(ONE)
  stakedTotal.save()

  let stakingRecord = getStakingRecord(event)
  stakingRecord.user = event.params.user
  stakingRecord.date = dayStartTimestamp
  stakingRecord.stakeType = StakeType_Staked
  stakingRecord.amount = event.params.amount
  stakingRecord.share = event.params.share
  stakingRecord.txNumber = stakedTotal.txCount
  stakingRecord.save()
}

export function handleRedeem(event: RedeemEvent): void {

  // update staked change
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    stakedChange = new StakedChange(event.transaction.hash.toHex())
    stakedChange.stakedAmount = event.params.redeemAmount
    stakedChange.timestamp = 0
    stakedChange.penalty = ZERO
    stakedChange.added = false
    stakedChange.save()
  }

  // update redeem
  let dayID = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  let entity = Redeem.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Redeem(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.amount = ZERO
    entity.share = ZERO
    entity.penalty = ZERO
    entity.timestamp = 0
    entity.date = 0
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.user = event.params.user
  entity.amount = event.params.redeemAmount
  entity.share = event.params.share
  entity.timestamp = event.block.timestamp.toI32()
  entity.penalty = event.params.penaltyAmount
  entity.date = dayStartTimestamp

  log.info(entity.transactionHash, null)
  entity.save()

  let stakedTotal = getStakedTotal()
  stakedTotal.txCount = stakedTotal.txCount.plus(ONE)
  stakedTotal.save()

  let stakingRecord = getStakingRecord(event)
  stakingRecord.user = event.params.user
  stakingRecord.date = dayStartTimestamp
  stakingRecord.stakeType = StakeType_Redeem
  stakingRecord.amount = event.params.redeemAmount
  stakingRecord.penalty = event.params.penaltyAmount
  stakingRecord.share = event.params.share
  stakingRecord.txNumber = stakedTotal.txCount
  stakingRecord.save()
}

export function handleCooldown(event: CooldownEvent): void {

  // update cooldown
  let dayID = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  let entity = Cooldown.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Cooldown(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.timestamp = 0
    entity.date = 0
  }
  entity.from = event.transaction.from as Bytes
  entity.to = event.transaction.to as Bytes
  entity.transactionHash = event.transaction.hash.toHex()
  entity.blockNumber = event.block.number
  entity.logIndex = event.logIndex
  entity.eventAddr = event.address
  entity.gasPrice = event.transaction.gasPrice
  entity.user = event.params.user
  entity.cooldownSeconds = LonStakingContract.COOLDOWN_SECONDS()
  entity.timestamp = event.block.timestamp.toI32()
  entity.date = dayStartTimestamp

  log.info(entity.transactionHash, null)
  entity.save()

  let stakedTotal = getStakedTotal()
  stakedTotal.txCount = stakedTotal.txCount.plus(ONE)
  stakedTotal.save()

  let stakingRecord = getStakingRecord(event)
  stakingRecord.user = event.params.user
  stakingRecord.date = dayStartTimestamp
  stakingRecord.stakeType = StakeType_Cooldown
  stakingRecord.cooldownSeconds = entity.cooldownSeconds
  stakingRecord.cooldownDate = dayStartTimestamp
  stakingRecord.txNumber = stakedTotal.txCount
  stakingRecord.save()
}