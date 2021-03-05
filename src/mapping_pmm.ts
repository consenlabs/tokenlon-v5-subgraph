import { BigDecimal } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { PMM, FillOrder as FillOrderEvent } from "../generated/PMM/PMM"
import { FillOrder, Token } from "../generated/schema"
import { getEthPriceInUSD } from "./uniswap/pricing"

export function handleFillOrder(event: FillOrderEvent): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = FillOrder.load(event.transaction.hash.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new FillOrder(event.transaction.hash.toHex())
  }
  let takerToken = Token.load(entity.takerAssetAddr.toHex())
  let makerToken = Token.load(entity.makerAssetAddr.toHex())

  // Entity fields can be set based on event parameters
  entity.source = event.params.source
  entity.transactionHash = event.params.transactionHash
  entity.orderHash = event.params.orderHash
  entity.userAddr = event.params.userAddr
  entity.takerAssetAddr = event.params.takerAssetAddr
  entity.takerAssetAmount = event.params.takerAssetAmount
  entity.makerAddr = event.params.makerAddr
  entity.makerAssetAddr = event.params.makerAssetAddr
  entity.makerAssetAmount = event.params.makerAssetAmount
  entity.receiverAddr = event.params.receiverAddr
  entity.settleAmount = event.params.settleAmount
  entity.feeFactor = event.params.feeFactor
  entity.ethPrice = getEthPriceInUSD()
  if (takerToken != null) {
    entity.takerAssetEth = takerToken.derivedETH
    entity.takerAssetPrice = entity.ethPrice.times(takerToken.derivedETH as BigDecimal)
  }
  if (makerToken != null) {
    entity.makerAssetEth = makerToken.derivedETH
    entity.makerAssetPrice = entity.ethPrice.times(makerToken.derivedETH as BigDecimal)
    // ((maker asset amount - settle amount) * derived eth - (gas * gas price))
    // isRelayerValid https://etherscan.io/address/0x0485C25A5E8D7d0c5676D0E6D3Bfc4aA597Ba0B0#readContract
    let maa = new BigDecimal(entity.makerAssetAmount)
    let sa = new BigDecimal(entity.settleAmount)
    let minerFee = new BigDecimal(event.transaction.gasUsed.times(event.transaction.gasPrice))
    entity.feeEth = maa.minus(sa)
                    .times(makerToken.derivedETH as BigDecimal)
                    .minus(minerFee)
    entity.feePrice = entity.feeEth.times(entity.ethPrice)
  }

  log.info(entity.transactionHash.toHex(), null)

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.EIP712_DOMAIN_HASH(...)
  // - contract.SOURCE(...)
  // - contract.operator(...)
  // - contract.permStorage(...)
  // - contract.spender(...)
  // - contract.userProxy(...)
  // - contract.version(...)
  // - contract.zeroExchange(...)
  // - contract.zxERC20Proxy(...)
}
