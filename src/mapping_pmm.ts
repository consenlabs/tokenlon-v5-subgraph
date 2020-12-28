import { BigInt } from "@graphprotocol/graph-ts"
import { log } from '@graphprotocol/graph-ts'
import { PMM, FillOrder as FillOrderEvent } from "../generated/PMM/PMM"
import { FillOrder } from "../generated/schema"

export function handleFillOrder(event: FillOrderEvent): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = FillOrder.load(event.transaction.hash.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new FillOrder(event.transaction.hash.toHex())
  }

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
