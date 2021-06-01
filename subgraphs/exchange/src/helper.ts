/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, Address, Bytes } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'
import { ERC20 } from "../generated/PMM/ERC20"
import { ERC20Bytes } from "../generated/PMM/ERC20Bytes"
import { TradedToken, User } from "../generated/schema"

export let ZERO = BigInt.fromI32(0)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE = BigInt.fromI32(1)
export let ONE_BD = BigDecimal.fromString('1')
export let ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
export let ETH_ADDRESS = Address.fromString('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
export let WETH_ADDRESS = Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")

export let isETH = (assetAddr: Bytes): boolean => {
  return (assetAddr == ZERO_ADDRESS) || (assetAddr == ETH_ADDRESS) || (assetAddr == WETH_ADDRESS)
}

export const addTradedToken = (tokenAddr: Address, startDate: i32): TradedToken | null => {
  let tokenAddrStr = tokenAddr.toHex()
  if (isETH(tokenAddr)) {
    tokenAddrStr = WETH_ADDRESS.toHex()
  }
  // check whether token is in the traded token
  let tradedToken = TradedToken.load(tokenAddrStr)
  if (tradedToken == null) {
    let tradedTokenContract = ERC20.bind(tokenAddr)
    let decimals = tradedTokenContract.try_decimals()
    if (!decimals.reverted) {
      let name = ''
      let symbol = ''
      let nameCall = tradedTokenContract.try_name()
      if (nameCall.reverted) {
        let tradedTokenBytesContract = ERC20Bytes.bind(tokenAddr)
        let nameCallBytes = tradedTokenBytesContract.try_name()
        if (nameCallBytes.reverted) {
          return null
        }
        name = nameCallBytes.value.toString()
      } else {
        name = nameCall.value
      }
      let symbolCall = tradedTokenContract.try_symbol()
      if (symbolCall.reverted) {
        let tradedTokenBytesContract = ERC20Bytes.bind(tokenAddr)
        let symbolCallBytes = tradedTokenBytesContract.try_symbol()
        if (symbolCallBytes.reverted) {
          return null
        }
        symbol = symbolCallBytes.value.toString()
      } else {
        symbol = symbolCall.value
      }
      tradedToken = new TradedToken(tokenAddrStr)
      tradedToken.address = tokenAddr
      tradedToken.startDate = startDate
      tradedToken.decimals = decimals.value
      tradedToken.name = name
      tradedToken.symbol = symbol
      tradedToken.save()
    }
  }
  return tradedToken
}

export const getUser = (userAddr: Address, event: ethereum.Event): User | null => {
  let userAddrStr = userAddr.toHex()
  let user = User.load(userAddrStr)
  if (user == null) {
    user = new User(userAddrStr)
    user.tradeCount = 0
    user.lastSeen = 0
    user.firstSeen = event.block.timestamp.toI32()
    user.firstBlock = event.block.number
    user.firstTx = event.transaction.hash.toHex()
  }
  return user
}

export const getEventID = (event: ethereum.Event): string => {
  let blockHash = event.block.hash.toHex()
  let txHash = event.transaction.hash.toHex()
  let logIndex = event.logIndex.toString()
  return blockHash + '-' + txHash + '-' + logIndex
}
