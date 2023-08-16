/* eslint-disable prefer-const */
import { BigInt, BigDecimal, ethereum, Address, Bytes, dataSource, log } from '@graphprotocol/graph-ts'
import { ERC20 } from '../generated/LimitOrder/ERC20'
import { ERC20Bytes } from '../generated/LimitOrder/ERC20Bytes'
import { TradedToken, User } from '../generated/schema'

export const ZERO = BigInt.fromI32(0)
export const ZERO_BD = BigDecimal.fromString('0')
export const ONE = BigInt.fromI32(1)
export const ONE_BD = BigDecimal.fromString('1')
export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000')
export const ETH_ADDRESS = Address.fromString('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
export const WETH_MAINNET = Address.fromString('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
export const WETH_ARBITRUM = Address.fromString('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1')
export const WETH_GOERLI = Address.fromString('0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6')

export const checkETH = (assetAddr: Address): Address => {
  // Supported Networks: https://thegraph.com/docs/en/developing/supported-networks/
  const networkName = dataSource.network()
  // In the Subgraph handler, using the === statement always results in false.
  // Please use the == statement for comparison.
  const wethAddress = networkName == 'mainnet' ? WETH_MAINNET : networkName == 'arbitrum-one' ? WETH_ARBITRUM : networkName == 'goerli' ? WETH_GOERLI : ETH_ADDRESS

  log.info('The current network is {}, and the obtained WETH address is {}.', [networkName, wethAddress.toHex()])

  return assetAddr == ZERO_ADDRESS || assetAddr == ETH_ADDRESS || assetAddr == WETH_MAINNET || assetAddr == WETH_ARBITRUM || assetAddr == WETH_GOERLI ? wethAddress : assetAddr
}

export const addTradedToken = (tokenAddrBytes: Bytes, startDate: BigInt): TradedToken | null => {
  const tokenAddr: Address = Address.fromBytes(tokenAddrBytes)
  const tokenAddrStr = checkETH(tokenAddr).toHex()

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
      tradedToken.address = tokenAddrBytes
      tradedToken.startDate = startDate.toI32()
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
