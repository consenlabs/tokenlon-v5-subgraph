import { BigDecimal } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { AMMWrapper, Swapped as SwappedEvent } from "../generated/AMMWrapper/AMMWrapper"
import { Swapped, SubsidizedSwapped, Token } from "../generated/schema"
import { getEthPriceInUSD } from './uniswap/pricing'

export function handleSwapped(event: SwappedEvent): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = Swapped.load(event.transaction.hash.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new Swapped(event.transaction.hash.toHex())
  }
  let takerToken = Token.load(entity.takerAssetAddr.toHex())
  let makerToken = Token.load(entity.makerAssetAddr.toHex())

  // Entity fields can be set based on event parameters
  entity.source = event.params.source
  entity.transactionHash = event.params.transactionHash
  entity.userAddr = event.params.userAddr
  entity.takerAssetAddr = event.params.takerAssetAddr
  entity.takerAssetAmount = event.params.takerAssetAmount
  entity.makerAddr = event.params.makerAddr
  entity.makerAssetAddr = event.params.makerAssetAddr
  entity.makerAssetAmount = event.params.makerAssetAmount
  entity.receiverAddr = event.params.receiverAddr
  entity.settleAmount = event.params.settleAmount
  entity.receivedAmount = event.params.receivedAmount
  entity.feeFactor = event.params.feeFactor
  entity.subsidyFactor = event.params.subsidyFactor
  entity.ethPrice = getEthPriceInUSD()
  if (takerToken != null) {
    entity.takerAssetEth = takerToken.derivedETH
    entity.takerAssetPrice = entity.ethPrice.times(takerToken.derivedETH as BigDecimal)
  }
  if (makerToken != null) {
    entity.makerAssetEth = makerToken.derivedETH
    entity.makerAssetPrice = entity.ethPrice.times(makerToken.derivedETH as BigDecimal)
    // ((received amount - settle amount) * derived eth - (gas * gas price))
    let ra = new BigDecimal(entity.receivedAmount)
    let sa = new BigDecimal(entity.settleAmount)
    let minerFee = new BigDecimal(event.transaction.gasUsed.times(event.transaction.gasPrice))
    entity.feeEth = ra.minus(sa)
                    .times(makerToken.derivedETH as BigDecimal)
                    .minus(minerFee)
    entity.feePrice = entity.feeEth.times(entity.ethPrice)
  }

  log.info(entity.transactionHash.toHex(), null)

  // Entities can be written to the store with `.save()`
  entity.save()
  processSubsidizedEvent(event)
}

const processSubsidizedEvent = (event: SwappedEvent): void => {
  if (event.params.settleAmount.gt(event.params.receivedAmount)) {
    let entity = SubsidizedSwapped.load(event.transaction.hash.toHex())

    // Entities only exist after they have been saved to the store;
    // `null` checks allow to create entities on demand
    if (entity == null) {
      entity = new SubsidizedSwapped(event.transaction.hash.toHex())
    }

    // Entity fields can be set based on event parameters
    entity.source = event.params.source
    entity.transactionHash = event.params.transactionHash
    entity.userAddr = event.params.userAddr
    entity.takerAssetAddr = event.params.takerAssetAddr
    entity.takerAssetAmount = event.params.takerAssetAmount
    entity.makerAddr = event.params.makerAddr
    entity.makerAssetAddr = event.params.makerAssetAddr
    entity.makerAssetAmount = event.params.makerAssetAmount
    entity.receiverAddr = event.params.receiverAddr
    entity.settleAmount = event.params.settleAmount
    entity.receivedAmount = event.params.receivedAmount
    entity.feeFactor = event.params.feeFactor
    entity.subsidyFactor = event.params.subsidyFactor

    log.info(entity.transactionHash.toHex(), null)
    entity.save()
  }
}
