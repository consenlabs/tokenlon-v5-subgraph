import { Bytes } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { Staked as StakedEvent, Redeem as RedeemEvent, Transfer as TransferEvent } from "../generated/LonStaking/LonStaking"
import { Staked, Redeem, StakedChange } from "../generated/schema"
import { ZERO, ZERO_BD, updateStakedData } from './helper'

export function handleStaked(event: StakedEvent): void {

  // update staked change
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    stakedChange = new StakedChange(event.transaction.hash.toHex())
    stakedChange.stakedAmount = event.params.amount
    stakedChange.date = 0
    stakedChange.apy = ZERO_BD
    stakedChange.added = true
    stakedChange.save()
  }

  // update staked
  let entity = Staked.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Staked(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.date = 0
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
  entity.date = event.block.timestamp.toI32()
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.share = event.params.share

  log.info(entity.transactionHash, null)
  entity.save()

  updateStakedData(event)
}

export function handleRedeem(event: RedeemEvent): void {

  // update staked change
  let stakedChange = StakedChange.load(event.transaction.hash.toHex())
  if (stakedChange == null) {
    stakedChange = new StakedChange(event.transaction.hash.toHex())
    stakedChange.stakedAmount = event.params.amount
    stakedChange.date = 0
    stakedChange.apy = ZERO_BD
    stakedChange.added = false
    stakedChange.save()
  }

  // update redeem
  let entity = Redeem.load(event.transaction.hash.toHex())
  if (entity == null) {
    entity = new Redeem(event.transaction.hash.toHex())
    entity.gasPrice = ZERO
    entity.date = 0
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
  entity.date = event.block.timestamp.toI32()
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.share = event.params.share

  log.info(entity.transactionHash, null)
  entity.save()

  updateStakedData(event)
}