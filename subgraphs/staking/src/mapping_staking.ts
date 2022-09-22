import { log } from '@graphprotocol/graph-ts'
import { Staked as StakedEvent, Redeem as RedeemEvent, Cooldown as CooldownEvent } from '../generated/LonStaking/LonStaking'
import { ONE, getStakedChange, getStaked, getRedeem, getCooldown, updateStakedData, getStakedTotal, LonStakingContract, getStakingRecord, StakeType_Staked, StakeType_Cooldown, StakeType_Redeem } from './helper'

export function handleStaked(event: StakedEvent): void {
  // update staked change
  const stakedChange = getStakedChange(event)!
  stakedChange.stakedAmount = event.params.amount
  stakedChange.added = true
  stakedChange.save()

  // update staked
  let dayID = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  const staked = getStaked(event)!
  staked.user = event.params.user
  staked.amount = event.params.amount
  staked.share = event.params.share
  staked.timestamp = event.block.timestamp.toI32()
  staked.date = dayStartTimestamp
  staked.save()

  const stakedTotal = getStakedTotal()!
  stakedTotal.txCount = stakedTotal.txCount.plus(ONE)
  stakedTotal.save()

  const stakingRecord = getStakingRecord(event)!
  stakingRecord.user = event.params.user
  stakingRecord.date = dayStartTimestamp
  stakingRecord.blockHash = event.block.hash.toHex()
  stakingRecord.stakeType = StakeType_Staked
  stakingRecord.amount = event.params.amount
  stakingRecord.share = event.params.share
  stakingRecord.txNumber = stakedTotal.txCount
  stakingRecord.save()

  updateStakedData(event)

  log.info('StakedEvent transaction hash: {}', [staked.transactionHash])
}

export function handleRedeem(event: RedeemEvent): void {
  // update staked change
  const stakedChange = getStakedChange(event)!
  stakedChange.stakedAmount = event.params.redeemAmount
  stakedChange.added = false
  stakedChange.save()

  // update redeem
  let dayID = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  const redeem = getRedeem(event)!
  redeem.user = event.params.user
  redeem.amount = event.params.redeemAmount
  redeem.share = event.params.share
  redeem.penalty = event.params.penaltyAmount
  redeem.date = dayStartTimestamp
  redeem.save()

  const stakedTotal = getStakedTotal()!
  stakedTotal.txCount = stakedTotal.txCount.plus(ONE)
  stakedTotal.save()

  const stakingRecord = getStakingRecord(event)!
  stakingRecord.user = event.params.user
  stakingRecord.date = dayStartTimestamp
  stakingRecord.stakeType = StakeType_Redeem
  stakingRecord.amount = event.params.redeemAmount
  stakingRecord.penalty = event.params.penaltyAmount
  stakingRecord.share = event.params.share
  stakingRecord.txNumber = stakedTotal.txCount
  stakingRecord.save()

  updateStakedData(event)

  log.info('RedeemEvent transaction hash: {}', [redeem.transactionHash])
}

export function handleCooldown(event: CooldownEvent): void {
  // update cooldown
  let dayID = event.block.timestamp.toI32() / 86400
  let dayStartTimestamp = dayID * 86400
  const cooldown = getCooldown(event)!
  cooldown.user = event.params.user
  cooldown.cooldownSeconds = LonStakingContract.COOLDOWN_SECONDS()
  cooldown.date = dayStartTimestamp
  cooldown.save()

  const stakedTotal = getStakedTotal()!
  stakedTotal.txCount = stakedTotal.txCount.plus(ONE)
  stakedTotal.save()

  const stakingRecord = getStakingRecord(event)!
  stakingRecord.user = event.params.user
  stakingRecord.date = dayStartTimestamp
  stakingRecord.stakeType = StakeType_Cooldown
  stakingRecord.cooldownSeconds = cooldown.cooldownSeconds
  stakingRecord.cooldownDate = dayStartTimestamp
  stakingRecord.txNumber = stakedTotal.txCount
  stakingRecord.save()

  log.info('CooldownEvent transaction hash: {}', [cooldown.transactionHash])
}
